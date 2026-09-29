import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientWalletRecharge } from '../entities/client-wallet-recharge.entity';
import {
  ClientRechargeStatus,
  ClientTransactionPurpose,
  ClientTransactionType,
} from '../enum';
import {
  GeneralLedgerEntry,
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/internal/finance/ledger/entities/general-ledger-entry.entity';
import { NotificationService } from '@/internal/notification/notification.service';
import { NotificationGateway } from '@/internal/notification/gateways/notification.gateway';
import { NotificationType } from '@/internal/notification/entities/notification.entity';
import { RoleEnum } from '@/internal/users/enums/Role.enum';
import { randomBytes } from 'crypto';

@Injectable()
export class RechargeWalletUseCase {
  private readonly logger = new Logger(RechargeWalletUseCase.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(
    clientId: number,
    amount: number,
    qr: QueryRunner,
    referenceId?: string,
    referenceType?: string,
    metadata?: Record<string, any>,
  ): Promise<ClientWallet> {
    this.logger.log(
      `[CLIENT_RECHARGE_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
    );

    this.logger.log(`wallet recharge metadata :: ${JSON.stringify(metadata)}`);

    const bonusAmount = Number(metadata?.bonus_amount) || 0;
    const totalCredit = Number(amount) + bonusAmount;

    // 1. Lock or create client wallet
    const wallet = await this.getOrCreateWallet(qr, clientId);

    // 2. Increment balance atomically
    await qr.manager
      .createQueryBuilder()
      .update(ClientWallet)
      .set({ balance: () => `balance + ${Number(totalCredit)}` })
      .where('id = :walletId', { walletId: wallet.id })
      .execute();

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + totalCredit;

    // no need re-fetch the wallet from db
    // just update the balance in memory, as we have used pessimistic_write lock
    // for ensuring atomicity and isolation, so no race condition will occur.
    wallet.balance = balanceAfter;

    // 3. Create wallet transaction record
    const transaction = qr.manager.create(ClientTransaction, {
      wallet_id: wallet.id,
      amount: totalCredit,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: ClientTransactionType.CREDIT,
      purpose: ClientTransactionPurpose.RECHARGE,
      reference_id: referenceId ?? null,
      reference_type: referenceType ?? 'gateway_recharge',
      metadata: metadata ?? null,
      transaction_no: randomBytes(16).toString('hex'),
    });

    const savedTx = await qr.manager.save(ClientTransaction, transaction);

    // 4. Create client wallet recharge record
    const rechargeRecord = qr.manager.create(ClientWalletRecharge, {
      wallet_id: wallet.id,
      amount,
      bonus_amount: bonusAmount,
      gst_amount: Number(metadata?.gst_amount) || 0,
      total_payable: Number(metadata?.total_payable) || amount,
      status: ClientRechargeStatus.SUCCESS,
      payment_gateway: metadata?.gateway_name || 'razorpay',
      gateway_order_id: metadata?.gateway_order_id || null,
      gateway_payment_id: metadata?.gateway_payment_id || referenceId || null,
      gateway_signature: metadata?.gateway_signature || null,
      wallet_transaction_id: savedTx.id,
      metadata: metadata ?? null,
    });
    await qr.manager.save(ClientWalletRecharge, rechargeRecord);

    // 5. In-transaction General Ledger Entry (Double-Entry Bookkeeping)
    const ledgerEntry = qr.manager.create(GeneralLedgerEntry, {
      event_id: referenceId ?? null,
      event_type: GeneralLedgerEventType.RECHARGE,
      entry_type: GeneralLedgerEntryType.CREDIT,
      party_type: GeneralLedgerPartyType.CLIENT,
      party_id: clientId,
      amount: totalCredit,
      note: `Client wallet recharge: ₹${amount}${bonusAmount > 0 ? ` + ₹${bonusAmount} bonus` : ''}`,
    });
    await qr.manager.save(GeneralLedgerEntry, ledgerEntry);

    // 6. Side effects (Notifications)
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

    return wallet;
  }

  private async getOrCreateWallet(qr: QueryRunner, clientId: number) {
    const existingWallet = await qr.manager.findOne(ClientWallet, {
      where: { client_id: clientId },
      lock: { mode: 'pessimistic_write' },
    });

    if (existingWallet) return existingWallet;

    const newWallet = qr.manager.create(ClientWallet, {
      client_id: clientId,
      balance: 0,
      reserved_balance: 0,
    });
    return await qr.manager.save(ClientWallet, newWallet);
  }
}
