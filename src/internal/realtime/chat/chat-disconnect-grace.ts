import { Logger } from '@nestjs/common';
import 'dotenv/config';
import type { Server } from 'socket.io';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import type { RealtimeActorType } from '../types/socket-auth.types';
import { closeActiveChatSessions } from './chat-session-settlement';

/**
 * Single source of truth for the disconnect grace window, in milliseconds.
 * A transport drop (refresh, network blip, tab close) only ends the session
 * when the actor stays gone past this window. Default 30s.
 */
export function chatDisconnectGraceMs(): number {
  const ms = parseInt(process.env.CHAT_DISCONNECT_GRACE_MS || '30000', 10);
  return Math.max(1, ms);
}

const logger = new Logger('ChatDisconnectGrace');
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const graceKey = (actorType: RealtimeActorType, actorId: number): string =>
  `${actorType}:${actorId}`;

/**
 * Socket iterables differ by what `@WebSocketServer()` hands us: the root
 * `Server` exposes the default namespace at `.sockets` (Map at
 * `.sockets.sockets`), while a namespaced gateway hands us the `Namespace`
 * itself (the Map directly at `.sockets`). Accept both; anything else
 * yields no sockets instead of throwing inside `handleDisconnect`.
 */
function allSockets(server: Server): Iterable<unknown> {
  const outer = (server as unknown as { sockets?: unknown }).sockets;
  if (outer instanceof Map) return outer.values();
  const inner =
    outer && typeof outer === 'object'
      ? (outer as { sockets?: unknown }).sockets
      : undefined;
  if (inner instanceof Map) return inner.values();
  return [];
}
/**
 * True when another socket for the same actor is still connected to this
 * instance (multi-tab). The disconnecting socket is already gone from the
 * map when `handleDisconnect` runs, so any match is a genuinely live tab.
 */
export function hasLiveActorSocket(
  server: Server,
  actorType: RealtimeActorType,
  actorId: number,
): boolean {
  for (const candidate of allSockets(server)) {
    const auth = (candidate as { data?: { auth?: unknown } }).data?.auth;
    if (!auth || typeof auth !== 'object') continue;
    const record = auth as Record<string, unknown>;
    if (record.actorType !== actorType) continue;
    const id =
      actorType === 'client' ? record.clientId : record.expertId;
    if (id === actorId) return true;
  }
  return false;
}

/**
 * Per-actor disconnect grace timers. Armed on transport drop, cancelled on
 * reconnect — a hard refresh rejoins well inside the window, so the session
 * survives. Process-local by nature (same trade-off as the pause/request
 * timers). The deferred close is idempotent: an explicit `chat:end` in the
 * meantime leaves no ACTIVE rows, so a stray fire emits nothing.
 */
export const chatDisconnectGrace = {
  /** Arm (or re-arm) the grace timer for an actor. */
  arm(
    db: DrizzleDb,
    server: Server,
    actorType: RealtimeActorType,
    actorId: number,
    filter: { clientId: number } | { expertId: number },
    endedBy: string,
  ): void {
    this.cancel(actorType, actorId);
    timers.set(
      graceKey(actorType, actorId),
      setTimeout(() => {
        timers.delete(graceKey(actorType, actorId));
        closeActiveChatSessions(db, server, filter, endedBy).catch(
          (err: Error) =>
            logger.error(
              `[ChatDisconnectGrace] Close failed for ${actorType}:${actorId}: ${err.message}`,
            ),
        );
      }, chatDisconnectGraceMs()),
    );
  },

  /** Cancel the timer — the actor reconnected inside the window. */
  cancel(actorType: RealtimeActorType, actorId: number): void {
    const key = graceKey(actorType, actorId);
    const pending = timers.get(key);
    if (pending) {
      clearTimeout(pending);
      timers.delete(key);
    }
  },
};
