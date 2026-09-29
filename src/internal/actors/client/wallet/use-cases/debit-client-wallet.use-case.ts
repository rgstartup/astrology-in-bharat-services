import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientTransactionType, ClientTransactionPurpose } from '../enum';
import { InsufficientBalanceError } from '../../../../finance/wallet/domain/errors/insufficient-balance.error';
import { ClientAccount } from '../../account/entities/account.entity';
import { generateTransactionNo } from '../../../../../shared/utils/transaction-no.util';
import {
  GeneralLedgerEntryType,
  GeneralLedgerEventType,
  GeneralLedgerPartyType,
} from '../../../../finance/ledger/entities/general-ledger-entry.entity';
import { LedgerQueueService } from '../../../../../core/queue/services/ledger-queue.service';
import { TransactionPurpose } from '../../../../finance/wallet/enum';

const purposeToLedgerEventType: Record<
  ClientTransactionPurpose,
  GeneralLedgerEventType
> = {
  [ClientTransactionPurpose.RECHARGE]: GeneralLedgerEventType.RECHARGE,
  [ClientTransactionPurpose.CONSULTATION]: GeneralLedgerEventType.CONSULTATION,
  [ClientTransactionPurpose.REFUND]: GeneralLedgerEventType.REFUND,
  [ClientTransactionPurpose.PRODUCT_PURCHASE]:
    GeneralLedgerEventType.PRODUCT_ORDER,
  [ClientTransactionPurpose.BOOKING_CONFIRMATION]:
    GeneralLedgerEventType.BOOKING,
  [ClientTransactionPurpose.PUJA_CONFIRMATION]: GeneralLedgerEventType.PUJA,
};

@Injectable()
export class DebitClientWalletUseCase {
  private readonly logger = new Logger(DebitClientWalletUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgerQueueService: LedgerQueueService,
  ) {}

  async execute(
    clientId: number,
    amount: number,
    purpose: ClientTransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: QueryRunner,
    allowNegative: boolean = false,
    referenceType?: string,
    metadata?: Record<string, any>,
  ): Promise<ClientWallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const qr = externalQueryRunner || this.dataSource.createQueryRunner();

    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      this.logger.log(
        `[CLIENT_DEBIT_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
      );

      let wallet = await qr.manager.findOne(ClientWallet, {
        where: { client_id: clientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        this.logger.log(
          `[CLIENT_DEBIT_TX] Wallet not found for client ${clientId}. Creating shell wallet...`,
        );
        wallet = qr.manager.create(ClientWallet, {
          client_id: clientId,
          balance: 0,
          reserved_balance: 0,
        });
        wallet = await qr.manager.save(ClientWallet, wallet);
      }

      const balance = Number(wallet.balance) || 0;
      if (!allowNegative && balance < amount) {
        this.logger.error(
          `[CLIENT_DEBIT_TX] Insufficient balance for client ${clientId}. Has: ${balance}, Needs: ${amount}`,
        );
        throw new InsufficientBalanceError();
      }

      await qr.manager
        .createQueryBuilder()
        .update(ClientWallet)
        .set({ balance: () => `balance - ${Number(amount)}` })
        .where('client_id = :clientId', { clientId })
        .execute();

      this.logger.log(
        `[CLIENT_DEBIT_TX] Balance subtracted for client ${clientId}`,
      );

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore - Number(amount);

      const transaction = qr.manager.create(ClientTransaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: ClientTransactionType.DEBIT,
        purpose,
        reference_id: referenceId ?? null,
        reference_type: referenceType ?? null,
        metadata: metadata ?? null,
      });
      const savedTx = await qr.manager.save(ClientTransaction, transaction);

      // Generate transaction number
      try {
        savedTx.transaction_no = generateTransactionNo(
          'CLIENT',
          purpose as unknown as TransactionPurpose,
          savedTx.id,
        );
        await qr.manager.save(ClientTransaction, savedTx);
      } catch (err) {
        this.logger.error(
          `[CLIENT_DEBIT_TX] Failed to generate transaction no: ${(err as Error).message}`,
        );
      }

      // Enqueue general ledger entry — fire-and-forget, never blocks the tx
      void this.ledgerQueueService.enqueue({
        event_id: referenceId ?? null,
        event_type:
          purposeToLedgerEventType[purpose] ??
          GeneralLedgerEventType.CONSULTATION,
        entry_type: GeneralLedgerEntryType.DEBIT,
        party_type: GeneralLedgerPartyType.CLIENT,
        party_id: clientId,
        amount,
      });

      // Update client spending tracking
      if (
        purpose === ClientTransactionPurpose.CONSULTATION ||
        purpose === ClientTransactionPurpose.PRODUCT_PURCHASE ||
        purpose === ClientTransactionPurpose.PUJA_CONFIRMATION
      ) {
        try {
          await qr.manager
            .createQueryBuilder()
            .update(ClientAccount)
            .set({
              total_spending: () =>
                `COALESCE(total_spending, 0) + ${Number(amount)}`,
            })
            .where('id = :id', { id: clientId })
            .execute();
        } catch (e) {
          this.logger.error(
            `[CLIENT_DEBIT_TX] Spending tracking failed: ${(e as Error).message}`,
          );
        }
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }

      const refreshedWallet = await qr.manager.findOne(ClientWallet, {
        where: { client_id: clientId },
      });
      return refreshedWallet as ClientWallet;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      this.logger.error(`[CLIENT_DEBIT_TX] Failed: ${(err as Error).message}`);
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
