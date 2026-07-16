import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '../../infrastructure/entities/transaction.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationGateway } from '@/modules/notification/api/gateways/notification.gateway';
import {
  NotificationType,
  ProfileType,
} from '@/modules/notification/infrastructure/entities/notification.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';

const purposeToLedgerEventType: Record<
  TransactionPurpose,
  GeneralLedgerEventType
> = {
  [TransactionPurpose.RECHARGE]: GeneralLedgerEventType.RECHARGE,
  [TransactionPurpose.CONSULTATION]: GeneralLedgerEventType.CONSULTATION,
  [TransactionPurpose.REFUND]: GeneralLedgerEventType.REFUND,
  [TransactionPurpose.WITHDRAWAL]: GeneralLedgerEventType.WITHDRAWAL,
  [TransactionPurpose.PRODUCT_PURCHASE]: GeneralLedgerEventType.PRODUCT_ORDER,
  [TransactionPurpose.PUJA_CONFIRMATION]: GeneralLedgerEventType.PUJA,
  [TransactionPurpose.AGENT_COMMISSION]:
    GeneralLedgerEventType.AGENT_COMMISSION,
};

const walletKeyToPartyType: Record<string, GeneralLedgerPartyType> = {
  client_id: GeneralLedgerPartyType.CLIENT,
  expert_id: GeneralLedgerPartyType.EXPERT,
  merchant_id: GeneralLedgerPartyType.MERCHANT,
  agent_id: GeneralLedgerPartyType.AGENT,
};

@Injectable()
export class CreditUseCase {
  private readonly logger = new Logger(CreditUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationFacade: NotificationFacade,
    private readonly notificationGateway: NotificationGateway,
    private readonly ledgerQueueService: LedgerQueueService,
  ) { }

  async execute(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const qr = externalQueryRunner || this.dataSource.createQueryRunner();

    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    const profileType: ProfileType =
      walletKey === 'expert_id'
        ? RoleEnum.EXPERT
        : walletKey === 'merchant_id'
          ? RoleEnum.MERCHANT
          : walletKey === 'agent_id'
            ? RoleEnum.AGENT
            : RoleEnum.CLIENT;

    try {
      this.logger.log(
        `[CREDIT_TX] Profile: ${profileId} (${walletKey}), Amount: ${amount}, Reference: ${referenceId}`,
      );

      let wallet = await qr.manager.findOne(Wallet, {
        where: { [walletKey]: profileId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        const newWallet = new Wallet();
        Object.assign(newWallet, { [walletKey]: profileId });
        newWallet.balance = 0;
        newWallet.reserved_balance = 0;
        wallet = await qr.manager.save(Wallet, newWallet);
        if (!wallet) {
          throw new BadRequestException('Unable to create wallet for profile');
        }
      }

      await qr.manager
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance + ${Number(amount)}` })
        .where(`${walletKey} = :profileId`, { profileId })
        .execute();

      this.logger.log(`[CREDIT_TX] Balance added for profile ${profileId}`);

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore + Number(amount);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.CREDIT,
        purpose,
        reference_id: referenceId,
      });
      const savedTx = await qr.manager.save(Transaction, transaction);

      // Generate transaction number using role derived from walletKey
      try {
        const roleForTx =
          walletKey === 'expert_id'
            ? 'EXPERT'
            : walletKey === 'merchant_id'
              ? 'MERCHANT'
              : walletKey === 'agent_id'
                ? 'AGENT'
                : 'CLIENT';

        savedTx.transaction_no = generateTransactionNo(
          roleForTx,
          purpose,
          savedTx.id,
        );
        await qr.manager.save(Transaction, savedTx);
      } catch (err) {
        this.logger.error(
          `[CREDIT_TX] Failed to generate transaction no: ${(err as Error).message}`,
        );
      }

      // Enqueue general ledger entry — fire-and-forget, never blocks the tx
      void this.ledgerQueueService.enqueue({
        event_id: referenceId ?? null,
        event_type: purposeToLedgerEventType[purpose],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type:
          walletKeyToPartyType[walletKey] ?? GeneralLedgerPartyType.CLIENT,
        party_id: profileId,
        amount,
      });

      // Update expert earning tracking
      if (
        walletKey === 'expert_id' &&
        (purpose === TransactionPurpose.CONSULTATION ||
          purpose === TransactionPurpose.PRODUCT_PURCHASE)
      ) {
        try {
          const expertProfile = await qr.manager.findOne(ProfileExpert, {
            where: { id: profileId },
            select: ['id'],
          });

          if (expertProfile) {
            await qr.manager
              .createQueryBuilder()
              .update(ProfileExpert)
              .set({
                total_earning: () =>
                  `COALESCE(total_earning, 0) + ${Number(amount)}`,
              })
              .where('id = :id', { id: expertProfile.id })
              .execute();
          }
        } catch (e) {
          this.logger.error(
            `[CREDIT_TX] Earning tracking failed: ${(e as Error).message}`,
          );
        }
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();

        if (
          purpose === TransactionPurpose.RECHARGE &&
          walletKey === 'client_id'
        ) {
          try {
            const title = 'Wallet Recharged';
            const message = `Your wallet has been credited with ₹${amount}`;
            await this.notificationFacade.create(
              profileId,
              profileType,
              NotificationType.WALLET_RECHARGE,
              title,
              message,
              { amount, referenceId },
            );
            this.notificationGateway.emitToProfile(
              profileId,
              'wallet_updated',
              {
                type: 'credit',
                amount,
                title,
                message,
              },
            );
          } catch (notifErr) {
            this.logger.error(
              `[CREDIT_TX] Notification failed: ${(notifErr as Error).message}`,
            );
          }
        }
      }

      const refreshedWallet = await qr.manager.findOne(Wallet, {
        where: { [walletKey]: profileId },
      });
      return refreshedWallet as Wallet;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      this.logger.error(`[CREDIT_TX] Failed: ${(err as Error).message}`);
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
