import { Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { Server } from 'socket.io';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultationSessions,
  consultations,
} from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';

const logger = new Logger('ChatSessionSettlement');

/** Parent states that may own a live session. */
const OPEN_STATUSES = [
  ConsultationStatus.ACCEPTED,
  ConsultationStatus.ACTIVE,
];

/**
 * Close every ACTIVE session under one consultation and stamp the parent's
 * `ended_at`. The consultation status is untouched so the client can resume
 * (a fresh session under the same consultation id). Idempotent: no ACTIVE
 * rows → returns false, emits nothing.
 */
async function closeForConsultation(
  db: DrizzleDb,
  server: Server,
  consultationId: number,
  endedBy: string,
): Promise<boolean> {
  const now = new Date();
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

  if (closed.length === 0) return false;

  await db
    .update(consultations)
    .set({ ended_at: now, updated_at: now })
    .where(eq(consultations.id, consultationId));

  logger.log(
    `[ChatSession] Consultation ${consultationId} sessions closed by ${endedBy} (${closed.length}).`,
  );
  server
    .to(SOCKET_ROOMS.CHAT_SESSION(consultationId))
    .emit(SOCKET_EVENTS.CHAT.ENDED, {
      consultationId,
      endedBy,
      timestamp: now.toISOString(),
    });
  return true;
}

/**
 * End sessions on transport drop. Finds the actor's open consultations
 * (ACCEPTED/ACTIVE) and closes ACTIVE sessions under each. Either an
 * unwanted disconnect or an implicit chat end lands here — both mean the
 * live session is over. Idempotent: repeat calls find no ACTIVE rows.
 */
export async function closeActiveChatSessions(
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
      logger.error(
        `[ChatSession] Close failed for ${row.id}: ${err.message}`,
      );
      return false;
    });
    if (didClose) closed.push(row.id);
  }
  return closed;
}
