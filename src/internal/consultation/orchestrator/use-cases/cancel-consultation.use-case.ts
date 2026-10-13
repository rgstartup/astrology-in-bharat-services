import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUIDv7 } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientTransactions,
  clientWallets,
  consultations,
} from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import {
  ClientTransactionPurpose,
  ClientTransactionType,
} from '@/internal/actors/client/wallet/enum';
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
   * @throws NotFoundException If consultation does not exist.
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

      const referenceId = `consultation_${updated.id}`;
      const [hold] = await tx
        .select({ amount: clientTransactions.amount })
        .from(clientTransactions)
        .where(
          and(
            eq(clientTransactions.reference_id, referenceId),
            eq(clientTransactions.type, ClientTransactionType.HOLD),
          ),
        )
        .limit(1);

      if (hold) {
        const [alreadyReleased] = await tx
          .select({ id: clientTransactions.id })
          .from(clientTransactions)
          .where(
            and(
              eq(clientTransactions.reference_id, referenceId),
              eq(clientTransactions.type, ClientTransactionType.RELEASE),
            ),
          )
          .limit(1);

        if (!alreadyReleased) {
          const [wallet] = await tx
            .select()
            .from(clientWallets)
            .where(eq(clientWallets.client_id, updated.client_id))
            .limit(1);

          if (wallet) {
            const held = Number(hold.amount);
            const reserved = Number(wallet.reserved_balance);
            const balance = Number(wallet.balance);
            const release = Math.min(held, reserved);

            await tx
              .update(clientWallets)
              .set({
                balance: String(balance + release),
                reserved_balance: String(reserved - release),
                updated_at: now,
              })
              .where(eq(clientWallets.id, wallet.id));

            await tx.insert(clientTransactions).values({
              wallet_id: wallet.id,
              amount: String(release),
              balance_before: String(balance),
              balance_after: String(balance + release),
              type: ClientTransactionType.RELEASE,
              purpose: ClientTransactionPurpose.REFUND,
              reference_id: referenceId,
              transaction_no: randomUUIDv7(),
            });
          }
        }
      }

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
