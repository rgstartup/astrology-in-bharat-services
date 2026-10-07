import { Logger } from '@nestjs/common';
import { randomUUIDv7 } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
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
import { SOCKET_EVENTS } from './constants/socket-events.constant';
import { SOCKET_ROOMS } from './constants/socket-rooms.constant';

const logger = new Logger('ChatRequestSettlement');

/**
 * Shared rejection verdict for unanswered chat requests. One guarded
 * REQUESTED → REJECTED flip (the multi-instance claim), the wallet HOLD
 * taken at initiate released back to balance in the same transaction, and
 * `chat:rejected` emitted to the waiting client only when this call claimed
 * the row. Free consultations hold nothing, so the release is a no-op for
 * them. Idempotent: repeat calls find no REQUESTED row and return false.
 */
export async function rejectChatConsultation(
  db: DrizzleDb,
  server: Server,
  consultationId: number,
): Promise<boolean> {
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(consultations)
      .set({
        status: ConsultationStatus.REJECTED,
        cancelled_at: now,
        updated_at: now,
      })
      .where(
        and(
          eq(consultations.id, consultationId),
          eq(consultations.status, ConsultationStatus.REQUESTED),
        ),
      )
      .returning({
        id: consultations.id,
        expert_id: consultations.expert_id,
        client_id: consultations.client_id,
      });
    if (!row) return null;

    const referenceId = `consultation_${row.id}`;
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
          .where(eq(clientWallets.client_id, row.client_id))
          .limit(1);

        if (!wallet) {
          logger.warn(
            `[ChatSettlement] No wallet for client ${row.client_id}; hold ${referenceId} kept in reserved.`,
          );
        } else {
          const held = Number(hold.amount);
          const reserved = Number(wallet.reserved_balance);
          const balance = Number(wallet.balance);
          // ponytail: clamp to reserved instead of throwing — expiry must never fail.
          const release = Math.min(held, reserved);
          if (release < held) {
            logger.warn(
              `[ChatSettlement] Hold/release mismatch on ${referenceId}: held ${held}, reserved ${reserved}.`,
            );
          }

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
    return row;
  });

  if (!claimed) return false;
  logger.log(`[ChatSettlement] Consultation ${consultationId} rejected.`);
  server
    .to(SOCKET_ROOMS.CHAT_SESSION(consultationId))
    .emit(SOCKET_EVENTS.CHAT.REJECTED, {
      consultationId,
      expertId: claimed.expert_id,
      timestamp: new Date().toISOString(),
    });
  return true;
}
