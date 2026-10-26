import { Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { ConsultationStatus } from '@/internal/consultation/enums';
import {
  CONSULTATION_ACK_STATUS,
  type ConsultationAckStatus,
} from '@/internal/realtime/constants/consultation-ack-status.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  toConsultationModeEnum,
  type ConsultationModeType,
} from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import {
  getConsultationStatus,
  isConsultationParticipant,
  resolveConsultationClientName,
} from './consultation-room-access';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import type { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import type { ResolveConsultationBudgetUseCase } from '@/internal/consultation/room/resolve-consultation-budget.use-case';
import type { MarkConsultationSessionStartedUseCase } from '@/internal/consultation/room/mark-consultation-session-started.use-case';
import type { ConsultationOrchestratorService } from '@/internal/consultation/orchestrator/consultation-orchestrator.service';
import type { VoiceService } from '@/external/voice';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';

const logger = new Logger('ConsultationRoomMembership');

export interface RoomJoinAck {
  status: ConsultationAckStatus;
  consultationId: number;
  /** Requested mode (echoed so a 'video' join metered as voice is explicit). */
  mode: ConsultationModeType;
  consultationStatus: string | null;
  maxMinutes?: number;
  startedAt?: string | null;
  elapsedSeconds?: number;
  clientName?: string | null;
  /** Voice token scoped to the consultation channel; voice/video only. */
  token?: string;
  tokenExpiresAt?: string;
  /** Media channel the token is scoped to (`SOCKET_ROOMS.VOICE_SESSION`). */
  channelName?: string;
}

export interface RoomMembershipDeps {
  db: DrizzleDb;
  rooms: ConsultationRoomRepository;
  budget: ResolveConsultationBudgetUseCase;
  orchestrator: ConsultationOrchestratorService;
  /** @deprecated No longer used: orchestrator.start() handles session start across all modes. */
  markStarted?: MarkConsultationSessionStartedUseCase;
  /** Absent on chat-only paths: voice/video joins then skip the token. */
  voice?: VoiceService;
}

export interface VoiceTokenAck {
  status: ConsultationAckStatus;
  consultationId: number;
  /** Voice token scoped to the consultation channel; absent when refused. */
  token?: string;
  tokenExpiresAt?: string;
  /** Media channel the token is scoped to (`SOCKET_ROOMS.VOICE_SESSION`). */
  channelName?: string;
}

/**
 * Stateless voice-token refresh for voice/video: re-issues the same
 * channel + UID binding after revalidating participation and lifecycle
 * status. Agora tokens are self-contained (expiry inside), so no Redis
 * storage is needed — a refresh is just a re-issue. Refused (ignored)
 * unless the consultation is ACCEPTED or ACTIVE.
 *
 * @param deps - Database for guards plus the voice facade for issuance.
 * @param consultationId - ID of the consultation to refresh media for.
 * @param identity - Requesting side (must participate).
 * @returns Token ack, or an `ignored` ack when refused.
 */
export async function refreshVoiceToken(
  deps: Pick<RoomMembershipDeps, 'db' | 'voice'>,
  consultationId: number,
  identity: AuthenticatedSocketIdentity,
): Promise<VoiceTokenAck> {
  if (!(await isConsultationParticipant(deps.db, consultationId, identity))) {
    return {
      status: CONSULTATION_ACK_STATUS.IGNORED,
      consultationId,
    };
  }
  const status = await getConsultationStatus(deps.db, consultationId);
  if (
    status !== ConsultationStatus.ACCEPTED &&
    status !== ConsultationStatus.ACTIVE
  ) {
    return {
      status: CONSULTATION_ACK_STATUS.IGNORED,
      consultationId,
    };
  }
  return {
    status: CONSULTATION_ACK_STATUS.TOKEN,
    consultationId,
    ...(await issueVoiceToken(deps.voice, consultationId, identity)),
  };
}

/**
 * Single-room join for chat + call + video.
 *
 * For chat, room entrance (`consultation:join`) immediately starts the
 * session via the orchestrator when ACCEPTED. Voice and video wait for the
 * media handshake: the session starts on the second
 * `consultation:media_ready` report, so a party that waits alone in the
 * lobby is never billed. Re-joining an ACTIVE consultation re-arms the budget
 * timer safely without overwriting started_at.
 *
 * @param deps - Room membership dependencies (db, rooms, budget, orchestrator, voice).
 * @param server - Authoritative Socket.IO server.
 * @param socket - Joining realtime socket.
 * @param consultationId - ID of the consultation room to enter.
 * @param mode - Requested consultation mode ('chat' | 'voice' | 'video').
 * @param identity - Authenticated socket identity (client or expert).
 * @returns Room join acknowledgement with live status, budget, and media info.
 */
export async function joinConsultationRoom(
  deps: RoomMembershipDeps,
  server: Server,
  socket: RealtimeSocket,
  consultationId: number,
  mode: ConsultationModeType,
  identity: AuthenticatedSocketIdentity,
): Promise<RoomJoinAck> {
  const { db, rooms, budget, orchestrator } = deps;

  if (!(await isConsultationParticipant(db, consultationId, identity))) {
    return {
      status: CONSULTATION_ACK_STATUS.IGNORED,
      consultationId,
      mode,
      consultationStatus: null,
    };
  }
  const room = SOCKET_ROOMS.CONSULTATION(consultationId);
  await socket.join(room);
  logger.debug(
    `Actor ${identity.actorType}:${identity.id} joined consultation room ${room} (socket: ${socket.id}, mode: ${mode})`,
  );

  const initialStatus = await getConsultationStatus(db, consultationId);
  let effectiveStatus = initialStatus;
  if (initialStatus === ConsultationStatus.ACCEPTED) {
    if (mode === 'chat') {
      // Chat has no media handshake: the first join opens the session.
      const actorId =
        identity.actorType === 'expert' ? identity.expertId : identity.id;
      await orchestrator.start(server, {
        consultationId,
        actorId,
        actorType: identity.actorType === 'expert' ? 'expert' : 'client',
      });
      effectiveStatus = ConsultationStatus.ACTIVE;
    }
    // Voice/video: the session opens on the second `consultation:media_ready`
    // report, so a client waiting alone in the lobby is never billed.
  } else if (initialStatus === ConsultationStatus.ACTIVE) {
    orchestrator.armBudgetTimer(server, consultationId, mode);
  }

  // Meter at the joined mode's rate: record before reading the budget.
  await rooms
    .setActiveMode(consultationId, toConsultationModeEnum(mode))
    .catch(() => null);
  const liveBudget = await budget.execute(consultationId).catch(() => null);
  const clientName = await resolveConsultationClientName(db, consultationId).catch(
    () => null,
  );

  return {
    status: CONSULTATION_ACK_STATUS.JOINED,
    consultationId,
    mode,
    consultationStatus: effectiveStatus,
    ...(liveBudget
      ? {
          maxMinutes: liveBudget.maxMinutes,
          startedAt: liveBudget.startedAt,
          elapsedSeconds: liveBudget.elapsedSeconds,
        }
      : {}),
    ...(clientName ? { clientName } : {}),
    ...(mode === 'chat'
      ? {}
      : await issueVoiceToken(deps.voice, consultationId, identity)),
  };
}

export async function leaveConsultationRoom(
  socket: RealtimeSocket,
  consultationId: number,
  identity: AuthenticatedSocketIdentity,
  rooms?: ConsultationRoomRepository,
): Promise<{ status: ConsultationAckStatus; consultationId: number }> {
  // Legacy `chat:{id}` / `call:{id}` drains: sockets joined before the
  // merge stay reachable until they reconnect.
  for (const room of [
    SOCKET_ROOMS.CONSULTATION(consultationId),
    `chat:${consultationId}`,
    `call:${consultationId}`,
  ]) {
    await socket.leave(room);
  }
  // A pre-billing media leave must revoke that side's readiness so a stale
  // single-side flag can never start billing after the peer re-readies.
  if (rooms) {
    await rooms
      .unmarkMediaReady(consultationId, identity.actorType)
      .catch(() => null);
  }
  logger.debug(
    `Actor ${identity.actorType}:${identity.id} left consultation rooms for ${consultationId} (socket: ${socket.id})`,
  );
  return { status: CONSULTATION_ACK_STATUS.LEFT, consultationId };
}

/**
 * Per-join voice token scoped to the consultation's voice channel.
 * Exported so the `consultation:voice_token` refresh path re-issues the
 * exact same channel + UID binding. Failures degrade to a tokenless join
 * (relay path) instead of rejecting — signing is local, so failure means
 * a code/config bug, not a transient worth retrying inline.
 */
export async function issueVoiceToken(
  voice: VoiceService | undefined,
  consultationId: number,
  identity: AuthenticatedSocketIdentity,
): Promise<Pick<RoomJoinAck, 'token' | 'tokenExpiresAt' | 'channelName'>> {
  if (!voice) return {};
  const tokenIdentity =
    identity.actorType === 'expert'
      ? `expert_${identity.expertId}_consult_${consultationId}`
      : `client_${identity.id}_consult_${consultationId}`;
  const channelName = SOCKET_ROOMS.VOICE_SESSION(consultationId);
  try {
    const issued = await voice.generateToken({
      identity: tokenIdentity,
      channelName,
    });
    return {
      token: issued.token,
      tokenExpiresAt: issued.expiresAt.toISOString(),
      channelName,
    };
  } catch (error) {
    logger.warn(
      `Voice token issuance failed for consultation ${consultationId}; joining without token.`,
      error,
    );
    return {};
  }
}
