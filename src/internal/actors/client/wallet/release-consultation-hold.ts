import { randomUUIDv7 } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientTransactions, clientWallets } from '@/core/drizzledb/schema';
import { ClientTransactionPurpose, ClientTransactionType } from './enum';

/**
 * Minimal drizzle surface needed to move money. The pooled connection and an
 * open transaction both satisfy it, so a release can run inside the caller's
 * transaction or on its own.
 */
export type WalletDb = Pick<DrizzleDb, 'select' | 'update' | 'insert'>;

/**
 * Reference shared by every wallet row that belongs to one consultation.
 *
 * @param consultationId - Id of the consultation the rows belong to.
 * @returns Reference id used by the HOLD/RELEASE transaction rows.
 */
export function consultationHoldReference(consultationId: number): string {
  return `consultation_${consultationId}`;
}

/**
 * Settles a started consultation's hold: debits what the client actually owes
 * (`payable`) out of the released hold and refunds the leftover to balance.
 *
 * Idempotent like {@link releaseConsultationHold}: any existing RELEASE row
 * makes a repeat call a no-op, so retries can never double-charge.
 * Consultations without a hold (free/promotional) settle to zeros.
 *
 * @param db - Drizzle connection or transaction to run the settle in.
 * @param clientId - Client account that owns the wallet.
 * @param consultationId - Consultation being settled.
 * @param payable - Amount actually owed for the consumed service.
 * @returns The debited and refunded amounts (0/0 when nothing was held).
 */
export async function settleConsultationHold(
  db: WalletDb,
  clientId: number,
  consultationId: number,
  payable: number,
): Promise<{ deduction: number; refund: number }> {
  const referenceId = consultationHoldReference(consultationId);

  const [hold] = await db
    .select({ amount: clientTransactions.amount })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.reference_id, referenceId),
        eq(clientTransactions.type, ClientTransactionType.HOLD),
      ),
    )
    .limit(1);

  const [alreadyReleased] = await db
    .select({ id: clientTransactions.id })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.reference_id, referenceId),
        eq(clientTransactions.type, ClientTransactionType.RELEASE),
      ),
    )
    .limit(1);

  if (!hold || alreadyReleased) return { deduction: 0, refund: 0 };

  const [wallet] = await db
    .select()
    .from(clientWallets)
    .where(eq(clientWallets.client_id, clientId))
    .limit(1);

  if (!wallet) return { deduction: 0, refund: 0 };

  const now = new Date();
  const held = Number(hold.amount);
  const reserved = Number(wallet.reserved_balance);
  const balance = Number(wallet.balance);
  const releaseable = Math.min(held, reserved);
  const deduction = Math.min(releaseable, Math.max(0, payable));
  const refund = releaseable - deduction;

  await db
    .update(clientWallets)
    .set({
      balance: String(balance + refund),
      reserved_balance: String(reserved - releaseable),
      updated_at: now,
    })
    .where(eq(clientWallets.id, wallet.id));

  await db.insert(clientTransactions).values({
    wallet_id: wallet.id,
    amount: String(releaseable),
    balance_before: String(balance),
    balance_after: String(balance + refund),
    type: ClientTransactionType.RELEASE,
    purpose: ClientTransactionPurpose.CONSULTATION,
    reference_id: referenceId,
    transaction_no: randomUUIDv7(),
  });

  return { deduction, refund };
}

/**
 * Releases the wallet hold that was taken when the consultation was
 * requested (balance → reserved) and refunds it to the available balance.
 *
 * Idempotent: a consultation whose hold was already released is a no-op, so
 * cancelling, rejecting and settling the same consultation can never refund
 * twice.
 *
 * @param db - Drizzle connection or transaction to run the release in.
 * @param clientId - Client account that owns the wallet.
 * @param consultationId - Consultation whose hold must be released.
 * @returns The released amount (0 when there was nothing to release).
 */
export async function releaseConsultationHold(
  db: WalletDb,
  clientId: number,
  consultationId: number,
): Promise<number> {
  const now = new Date();
  const referenceId = consultationHoldReference(consultationId);

  const [hold] = await db
    .select({ amount: clientTransactions.amount })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.reference_id, referenceId),
        eq(clientTransactions.type, ClientTransactionType.HOLD),
      ),
    )
    .limit(1);

  if (!hold) return 0;

  const [alreadyReleased] = await db
    .select({ id: clientTransactions.id })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.reference_id, referenceId),
        eq(clientTransactions.type, ClientTransactionType.RELEASE),
      ),
    )
    .limit(1);

  if (alreadyReleased) return 0;

  const [wallet] = await db
    .select()
    .from(clientWallets)
    .where(eq(clientWallets.client_id, clientId))
    .limit(1);

  if (!wallet) return 0;

  const held = Number(hold.amount);
  const reserved = Number(wallet.reserved_balance);
  const balance = Number(wallet.balance);
  const release = Math.min(held, reserved);

  await db
    .update(clientWallets)
    .set({
      balance: String(balance + release),
      reserved_balance: String(reserved - release),
      updated_at: now,
    })
    .where(eq(clientWallets.id, wallet.id));

  await db.insert(clientTransactions).values({
    wallet_id: wallet.id,
    amount: String(release),
    balance_before: String(balance),
    balance_after: String(balance + release),
    type: ClientTransactionType.RELEASE,
    purpose: ClientTransactionPurpose.REFUND,
    reference_id: referenceId,
    transaction_no: randomUUIDv7(),
  });

  return release;
}
