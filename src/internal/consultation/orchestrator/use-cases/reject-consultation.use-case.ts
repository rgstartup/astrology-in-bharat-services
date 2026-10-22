import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { releaseConsultationHold } from '@/internal/actors/client/wallet/release-consultation-hold';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  RejectConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Handles rejecting a requested consultation booking.
 *
 * Responsibilities:
 * - Guard that consultation is in `REQUESTED` status.
 * - Verify ownership based on actor: expert owns expert_id, client owns client_id, system owns any.
 * - Mark status as `REJECTED` and set `cancelled_at` in DB.
 * - Atomically release wallet hold taken at initiate back to client's wallet balance.
 * - Broadcast rejection events to consultation, chat, and expert rooms with given reason.
 */
@Injectable()
export class RejectConsultationUseCase {
  private readonly logger = new Logger(RejectConsultationUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Executes the reject consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, actorId, actorType, and optional rejection reason.
   * @returns Object containing confirmation status and consultationId.
   * @throws BadRequestException If consultation is not in REQUESTED status or not owned by actor.
   */
  async execute(server: Server, command: RejectConsultationCommand) {
    const now = new Date();

    const claimed = await this.db.transaction(async (tx) => {
      // Build where conditions
      const whereConditions = [
        eq(consultations.id, command.consultationId),
        eq(consultations.status, ConsultationStatus.REQUESTED),
      ];

      if (command.actorType === 'expert' && command.actorId > 0) {
        whereConditions.push(eq(consultations.expert_id, command.actorId));
      } else if (command.actorType === 'client' && command.actorId > 0) {
        whereConditions.push(eq(consultations.client_id, command.actorId));
      }

      const [row] = await tx
        .update(consultations)
        .set({
          status: ConsultationStatus.REJECTED,
          cancelled_at: now,
          updated_at: now,
        })
        .where(and(...whereConditions))
        .returning();

      if (!row) return null;

      // Release any wallet HOLD transaction for this consultation
      await releaseConsultationHold(tx, row.client_id, row.id);

      return row;
    });

    if (!claimed) {
      throw new BadRequestException('Consultation cannot be rejected');
    }

    const mode = toConsultationModeType(claimed.mode);

    const payload = {
      consultationId: claimed.id,
      expertId: claimed.expert_id,
      mode,
      reason: command.reason ?? 'rejected',
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(claimed.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.REJECTED, payload);
    server
      .to(SOCKET_ROOMS.EXPERT(claimed.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.REJECTED, payload);

    return { status: 'rejected', consultationId: claimed.id };
  }
}
