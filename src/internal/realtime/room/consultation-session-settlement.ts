import { Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { Server } from 'socket.io';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { releaseConsultationHold } from '@/internal/actors/client/wallet/release-consultation-hold';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import { toConsultationModeType } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';

const logger = new Logger('ConsultationSessionSettlement');

/** Parent states that may own a live session. */
const OPEN_STATUSES = [ConsultationStatus.ACCEPTED, ConsultationStatus.ACTIVE];

/**
 * Settle a consultation that was accepted but never started.
 *
 * The client sat in the lobby, no media was ever exchanged, so the wallet
 * hold taken at request time must be refunded and the consultation must not
 * be left dangling in the lobby. Idempotent: only a PENDING session counts.
 *
 * @param db - Database handle used for the settle transaction.
 * @param server - Authoritative Socket.IO server used to broadcast the end.
 * @param consultationId - Consultation that never started.
 * @param parent - Parent consultation row (mode, owning client, start time).
 * @param endedBy - Who ended the consultation.
 * @param now - Timestamp used for the settle writes.
 * @returns True when the consultation was settled here.
 */
async function closeNeverStarted(
  db: DrizzleDb,
  server: Server,
  consultationId: number,
  parent: { mode: string; client_id: number; started_at: Date | null } | undefined,
  endedBy: string,
  now: Date,
): Promise<boolean> {
  if (!parent) return false;
  // A consultation that already started was billed: never cancel or refund it.
  if (parent.started_at) return false;

  const [pending] = await db
    .select({ id: consultationSessions.id })
    .from(consultationSessions)
    .where(
      and(
        eq(consultationSessions.consultation_id, consultationId),
        eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
      ),
    )
    .limit(1);
  if (!pending) return false;

  const refunded = await db.transaction(async (tx) => {
    await tx
      .update(consultationSessions)
      .set({
        status: ConsultationSessionStatus.CANCELLED,
        ended_at: now,
        updated_at: now,
      })
      .where(eq(consultationSessions.id, pending.id));
    await tx
      .update(consultations)
      .set({
        status: ConsultationStatus.CANCELLED,
        cancelled_at: now,
        ended_at: now,
        duration_seconds: 0,
        updated_at: now,
      })
      .where(eq(consultations.id, consultationId));
    return releaseConsultationHold(tx, parent.client_id, consultationId);
  });

  logger.log(
    `[ConsultationSession] Consultation ${consultationId} never started (${endedBy}) — cancelled, refunded ${refunded}.`,
  );
  server
    .to(SOCKET_ROOMS.CONSULTATION(consultationId))
    .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, {
      consultationId,
      mode: toConsultationModeType(parent.mode ?? 'chat'),
      endedBy,
      reason: 'never_started',
      totalDurationSeconds: 0,
      timestamp: now.toISOString(),
    });
  return true;
}

/**
 * Close every ACTIVE session under one consultation and stamp the parent's
 * `ended_at`. The consultation status is untouched so the client can resume
 * (a fresh session under the same consultation id). Idempotent: no ACTIVE
 * rows → falls back to the never-started settle, which refunds the client.
 */
async function closeForConsultation(
  db: DrizzleDb,
  server: Server,
  consultationId: number,
  endedBy: string,
): Promise<boolean> {
  const now = new Date();
  const [parent] = await db
    .select({
      mode: consultations.mode,
      client_id: consultations.client_id,
      started_at: consultations.started_at,
    })
    .from(consultations)
    .where(eq(consultations.id, consultationId))
    .limit(1);

  const closed = await db
    .update(consultationSessions)
    .set({
      status: ConsultationSessionStatus.COMPLETED,
      ended_at: now,
      updated_at: now,
    })
    .where(
      and(
        eq(consultationSessions.consultation_id, consultationId),
        eq(consultationSessions.status, ConsultationSessionStatus.ACTIVE),
      ),
    )
    .returning({ id: consultationSessions.id });

  if (closed.length === 0) {
    return closeNeverStarted(db, server, consultationId, parent, endedBy, now);
  }

  await db
    .update(consultations)
    .set({ ended_at: now, updated_at: now })
    .where(eq(consultations.id, consultationId));

  logger.log(
    `[ConsultationSession] Consultation ${consultationId} sessions closed by ${endedBy} (${closed.length}).`,
  );
  server
    .to(SOCKET_ROOMS.CONSULTATION(consultationId))
    .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, {
      consultationId,
      mode: toConsultationModeType(parent?.mode ?? 'chat'),
      endedBy,
      timestamp: now.toISOString(),
    });
  return true;
}

/**
 * End sessions on transport drop. Finds the actor's open consultations
 * (ACCEPTED/ACTIVE) and closes ACTIVE sessions under each across any mode
 * (chat, voice, video). Idempotent: repeat calls find no ACTIVE rows.
 *
 * @param db - Database handle.
 * @param server - Authoritative Socket.IO server.
 * @param filter - Identity filter for the disconnecting actor.
 * @param endedBy - Reason/identifier for the session termination.
 * @returns Array of settled consultation IDs.
 */
export async function closeActiveConsultationSessions(
  db: DrizzleDb,
  server: Server,
  filter: { clientId: number } | { expertId: number },
  endedBy: string,
): Promise<number[]> {
  const owner =
    'clientId' in filter
      ? eq(consultations.client_id, filter.clientId)
      : eq(consultations.expert_id, filter.expertId);

  const open = await db
    .select({ id: consultations.id })
    .from(consultations)
    .where(and(owner, inArray(consultations.status, OPEN_STATUSES)));

  const closed: number[] = [];
  for (const row of open) {
    const didClose = await closeForConsultation(
      db,
      server,
      row.id,
      endedBy,
    ).catch((err: Error) => {
      logger.error(`[ConsultationSession] Close failed for ${row.id}: ${err.message}`);
      return false;
    });
    if (didClose) closed.push(row.id);
  }
  return closed;
}

/** Legacy alias */
export const closeActiveChatSessions = closeActiveConsultationSessions;
