import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { releaseConsultationHold } from '@/internal/actors/client/wallet/release-consultation-hold';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { CancelConsultationCommand, toConsultationModeType } from '../consultation-orchestrator.types';

/**
 * Handles a client cancelling a pending consultation request.
 *
 * Responsibilities:
 * - Guard that consultation is in `REQUESTED` status and owned by the client.
 * - Mark status as `CANCELLED` and release wallet hold back to available balance.
 * - Clear the request room key.
 * - Broadcast cancellation to consultation and expert rooms.
 */
@Injectable()
export class CancelConsultationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
  ) {}

  /**
   * Executes the cancel consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, client actorId, and optional reason.
   * @returns Object containing confirmation status and consultationId.
   * @throws BadRequestException If consultation is not in REQUESTED status or not owned by client.
   */
  async execute(server: Server, command: CancelConsultationCommand) {
    const now = new Date();

    const claimed = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(consultations)
        .where(eq(consultations.id, command.consultationId))
        .limit(1);

      if (!row) return null;
      if (row.client_id !== command.actorId) return 'forbidden';
      if (row.status !== ConsultationStatus.REQUESTED) return 'bad-state';

      const [updated] = await tx
        .update(consultations)
        .set({
          status: ConsultationStatus.CANCELLED,
          cancelled_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(consultations.id, command.consultationId),
            eq(consultations.status, ConsultationStatus.REQUESTED),
          ),
        )
        .returning();

      if (!updated) return null;

      // Release the wallet hold taken at request time back to the client.
      await releaseConsultationHold(tx, updated.client_id, updated.id);

      return updated;
    });

    if (claimed === 'forbidden') {
      throw new BadRequestException('Only the client can cancel this consultation');
    }
    if (claimed === 'bad-state' || !claimed) {
      throw new BadRequestException('Consultation cannot be cancelled');
    }

    await this.rooms.cancelRequestExpiry(claimed.id);

    const mode = toConsultationModeType(claimed.mode);

    const payload = {
      consultationId: claimed.id,
      expertId: claimed.expert_id,
      mode,
      reason: command.reason ?? 'cancelled',
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(claimed.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.CANCELLED, payload);
    server
      .to(SOCKET_ROOMS.EXPERT(claimed.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.CANCELLED, payload);

    return { status: 'cancelled', consultationId: claimed.id };
  }
}
