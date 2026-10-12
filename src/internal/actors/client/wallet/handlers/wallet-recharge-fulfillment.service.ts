import { Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  clientTransactions,
  clientWalletRecharges,
  clientWallets,
  generalLedger,
} from '@/core/drizzledb/schema';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/core/enums';
import {
  ClientRechargeStatus,
  ClientTransactionPurpose,
  ClientTransactionType,
} from '../enum';
import { NotificationService } from '@/internal/notification/notification.service';
import { NotificationGateway } from '@/internal/notification/gateways/notification.gateway';
import { NotificationType } from '@/internal/notification/entities/notification.entity';
import { RoleEnum } from '@/internal/users/enums/Role.enum';
import { randomBytes } from 'crypto';

export interface WalletRechargeFulfillmentInput {
  clientId: number;
  amount: number;
  bonusAmount: number;
  totalCredit: number;
  referenceId: string;
  metadata: Record<string, any>;
}

/**
 * Drizzle-native wallet-recharge fulfillment: credit wallet + movement row +
 * recharge row + recharge-only general-ledger entry + notifications.
 * Runs inside the caller's Drizzle tx so the credit stays atomic with the
 * payment marking (verify) or standalone (intent handler).
 */
@Injectable()
export class WalletRechargeFulfillmentService {
  private readonly logger = new Logger(WalletRechargeFulfillmentService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async fulfillTx(
    tx: DrizzleTx,
    input: WalletRechargeFulfillmentInput,
  ): Promise<void> {
    const { clientId, amount, bonusAmount, totalCredit, referenceId, metadata } =
      input;

    const wallet = await this.getOrCreateWalletTx(tx, clientId);

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + totalCredit;

    await tx
      .update(clientWallets)
      .set({
        balance: sql`${clientWallets.balance} + ${totalCredit}`,
        updated_at: new Date(),
      })
      .where(eq(clientWallets.id, wallet.id));

    const [savedTx] = await tx
      .insert(clientTransactions)
      .values({
        wallet_id: wallet.id,
        amount: String(totalCredit),
        balance_before: String(balanceBefore),
        balance_after: String(balanceAfter),
        type: ClientTransactionType.CREDIT,
        purpose: ClientTransactionPurpose.RECHARGE,
        reference_id: referenceId,
        reference_type: 'gateway_recharge',
        metadata: metadata ?? null,
        transaction_no: randomBytes(16).toString('hex'),
      })
      .returning({ id: clientTransactions.id });

    await tx.insert(clientWalletRecharges).values({
      wallet_id: wallet.id,
      amount: String(amount),
      bonus_amount: String(bonusAmount),
      gst_amount: String(Number(metadata?.gst_amount) || 0),
      total_payable: String(Number(metadata?.total_payable) || amount),
      status: ClientRechargeStatus.SUCCESS,
      payment_gateway:
        (metadata?.gateway_name as string | undefined) || 'razorpay',
      gateway_order_id:
        (metadata?.gateway_order_id as string | undefined) || null,
      gateway_payment_id:
        (metadata?.gateway_payment_id as string | undefined) ||
        referenceId ||
        null,
      gateway_signature:
        (metadata?.gateway_signature as string | undefined) || null,
      wallet_transaction_id: savedTx.id,
      metadata: metadata ?? null,
    });

    await tx.insert(generalLedger).values({
      event_id: referenceId ?? null,
      event_type: GeneralLedgerEventType.RECHARGE,
      entry_type: GeneralLedgerEntryType.CREDIT,
      party_type: GeneralLedgerPartyType.CLIENT,
      party_id: clientId,
      amount: String(totalCredit),
      note: `Client wallet recharge: ₹${amount}${bonusAmount > 0 ? ` + ₹${bonusAmount} bonus` : ''}`,
    });

    await this.notifyRecharge(clientId, totalCredit, referenceId);
  }

  private async getOrCreateWalletTx(tx: DrizzleTx, clientId: number) {
    const [existing] = await tx
      .select()
      .from(clientWallets)
      .where(eq(clientWallets.client_id, clientId))
      .limit(1);

    if (existing) return existing;

    const [created] = await tx
      .insert(clientWallets)
      .values({
        client_id: clientId,
        balance: '0',
        reserved_balance: '0',
      })
      .returning();

    return created;
  }

  async notifyRecharge(
    clientId: number,
    totalCredit: number,
    referenceId?: string,
  ) {
    try {
      const title = 'Wallet Recharged';
      const message = `Your wallet has been credited with ₹${totalCredit}`;
      await this.notificationService.create(
        clientId,
        RoleEnum.CLIENT,
        NotificationType.WALLET_RECHARGE,
        title,
        message,
        { amount: totalCredit, referenceId },
      );
      this.notificationGateway.emitToProfile(clientId, 'wallet_updated', {
        type: 'credit',
        amount: totalCredit,
        title,
        message,
      });
    } catch (notifErr) {
      this.logger.error(
        `[CLIENT_RECHARGE_TX] Notification failed: ${(notifErr as Error).message}`,
      );
    }
  }
}
