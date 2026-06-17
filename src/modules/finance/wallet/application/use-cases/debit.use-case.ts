import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '../../infrastructure/entities/transaction.entity';
import { InsufficientBalanceError } from '../../domain/errors/insufficient-balance.error';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { LedgerQueueService } from '@/modules/queue/services/ledger-queue.service';

const purposeToLedgerEventType: Record<TransactionPurpose, GeneralLedgerEventType> = {
  [TransactionPurpose.RECHARGE]: GeneralLedgerEventType.RECHARGE,
  [TransactionPurpose.CONSULTATION]: GeneralLedgerEventType.CONSULTATION,
  [TransactionPurpose.REFUND]: GeneralLedgerEventType.REFUND,
  [TransactionPurpose.WITHDRAWAL]: GeneralLedgerEventType.WITHDRAWAL,
  [TransactionPurpose.PRODUCT_PURCHASE]: GeneralLedgerEventType.PRODUCT_ORDER,
  [TransactionPurpose.PUJA_CONFIRMATION]: GeneralLedgerEventType.PUJA,
  [TransactionPurpose.AGENT_COMMISSION]: GeneralLedgerEventType.AGENT_COMMISSION,
};

const walletKeyToPartyType: Record<string, GeneralLedgerPartyType> = {
  client_id: GeneralLedgerPartyType.CLIENT,
  expert_id: GeneralLedgerPartyType.EXPERT,
  merchant_id: GeneralLedgerPartyType.MERCHANT,
  agent_id: GeneralLedgerPartyType.AGENT,
};

@Injectable()
export class DebitUseCase {
  private readonly logger = new Logger(DebitUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgerQueueService: LedgerQueueService,
  ) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: QueryRunner,
    allowNegative: boolean = false,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const qr = externalQueryRunner || this.dataSource.createQueryRunner();

    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      this.logger.log(
        `[DEBIT_TX] Profile: ${profileId} (${walletKey}), Amount: ${amount}, Reference: ${referenceId}`,
      );

      let wallet = await qr.manager.findOne(Wallet, {
        where: { [walletKey]: profileId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        this.logger.log(
          `[DEBIT_TX] Wallet not found for ${profileId}. Creating shell wallet...`,
        );
        wallet = qr.manager.create(Wallet, {
          [walletKey]: profileId,
          balance: 0,
          reserved_balance: 0,
        });
        wallet = await qr.manager.save(Wallet, wallet);
      }

      const balance = Number(wallet.balance) || 0;
      if (!allowNegative && balance < amount) {
        this.logger.error(
          `[DEBIT_TX] Insufficient balance for ${profileId}. Has: ${balance}, Needs: ${amount}`,
        );
        throw new InsufficientBalanceError();
      }

      await qr.manager
        .createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance - ${Number(amount)}` })
        .where(`${walletKey} = :profileId`, { profileId })
        .execute();

      this.logger.log(`[DEBIT_TX] Balance subtracted for profile ${profileId}`);

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore - Number(amount);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.DEBIT,
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
          `[DEBIT_TX] Failed to generate transaction no: ${(err as Error).message}`,
        );
      }

      // Enqueue general ledger entry — fire-and-forget, never blocks the tx
      void this.ledgerQueueService.enqueue({
        event_id: referenceId ?? null,
        event_type: purposeToLedgerEventType[purpose],
        entry_type: GeneralLedgerEntryType.DEBIT,
        party_type: walletKeyToPartyType[walletKey] ?? GeneralLedgerPartyType.CLIENT,
        party_id: profileId,
        amount,
      });

      // Update client spending tracking
      if (
        walletKey === 'client_id' &&
        (purpose === TransactionPurpose.CONSULTATION ||
          purpose === TransactionPurpose.PRODUCT_PURCHASE)
      ) {
        try {
          await qr.manager
            .createQueryBuilder()
            .update(ProfileClient)
            .set({
              total_spending: () =>
                `COALESCE(total_spending, 0) + ${Number(amount)}`,
            })
            .where('id = :id', { id: profileId })
            .execute();
        } catch (e) {
          this.logger.error(
            `[DEBIT_TX] Spending tracking failed: ${(e as Error).message}`,
          );
        }
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }

      const refreshedWallet = await qr.manager.findOne(Wallet, {
        where: { [walletKey]: profileId },
      });
      return refreshedWallet as Wallet;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      this.logger.error(`[DEBIT_TX] Failed: ${(err as Error).message}`);
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
