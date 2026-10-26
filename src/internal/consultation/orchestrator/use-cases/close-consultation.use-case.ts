import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { ConsultationEndedPayload } from '../consultation-orchestrator.types';
import {
  CloseConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Expert-closes a completed/reopened consultation for good.
 *
 * `closed` is terminal: no further `consultation:request` can reopen it
 * (only `REQUESTED`/`REOPENED`/`COMPLETED` are continuable). Closing also
 * cancels any pending re-request session and drops the room/budget keys.
 * Participants receive `consultation:ended` with reason `closed`, so both
 * apps treat the thread as finished with no extra wiring.
 */
@Injectable()
export class CloseConsultationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
  ) {}

  async execute(server: Server, command: CloseConsultationCommand) {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new BadRequestException('Consultation not found');
    if (row.expert_id !== command.actorId) {
      throw new BadRequestException('Only the expert can close this consultation');
    }
    if (
      row.status !== ConsultationStatus.COMPLETED &&
      row.status !== ConsultationStatus.REOPENED
    ) {
      throw new BadRequestException('Consultation cannot be closed');
    }

    const now = new Date();
    const mode = toConsultationModeType(row.mode);

    await this.db.transaction(async (tx) => {
      await tx
        .update(consultations)
        .set({ status: ConsultationStatus.CLOSED, updated_at: now })
        .where(eq(consultations.id, row.id));

      // A pending re-request session has no service behind it anymore.
      await tx
        .update(consultationSessions)
        .set({
          status: ConsultationSessionStatus.CANCELLED,
          ended_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(consultationSessions.consultation_id, row.id),
            inArray(consultationSessions.status, [
              ConsultationSessionStatus.PENDING,
            ]),
          ),
        );
    });

    // Drop room key, pause gates, billing hold, and budget snapshot so state
    // cannot leak into a future consultation for the same thread.
    await this.rooms.clearRoom(row.id);
    await this.rooms.clearPaused(row.id);
    await this.rooms.clearBillingHold(row.id);

    const payload: ConsultationEndedPayload = {
      consultationId: row.id,
      mode,
      endedBy: String(command.actorId),
      reason: command.reason ?? 'closed',
      totalDurationSeconds: row.duration_seconds ?? 0,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, payload);
    server
      .to(SOCKET_ROOMS.EXPERT(row.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, payload);

    return { status: 'closed', consultationId: row.id };
  }
}
