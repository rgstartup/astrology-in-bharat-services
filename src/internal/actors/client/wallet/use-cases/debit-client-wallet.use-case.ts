import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  clientTransactions,
  clientWallets,
} from '@/core/drizzledb/schema';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientTransactionType, ClientTransactionPurpose } from '../enum';
import { InsufficientBalanceError } from '@/internal/finance/wallet/domain/errors/insufficient-balance.error';
import { ClientAccount } from '@/internal/actors/client/account/entities/account.entity';
import { generateTransactionNo } from '@/shared/utils/transaction-no.util';
import { TransactionPurpose } from '@/internal/finance/wallet/enum';
import { toClientWalletResponse } from '../wallet.mapper';

@Injectable()
export class DebitClientWalletUseCase {
  private readonly logger = new Logger(DebitClientWalletUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

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

    // Standalone: Drizzle-owned transaction. An external TypeORM
    // QueryRunner (commerce order, payments flows) keeps the legacy
    // TypeORM path so the debit stays atomic with the caller's tx.
    if (!externalQueryRunner) {
      return this.db.transaction(async (tx) => {
        this.logger.log(
          `[CLIENT_DEBIT_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
        );

        let [wallet] = await tx
          .select()
          .from(clientWallets)
          .where(eq(clientWallets.client_id, clientId))
          .limit(1);

        if (!wallet) {
          this.logger.log(
            `[CLIENT_DEBIT_TX] Wallet not found for client ${clientId}. Creating shell wallet...`,
          );
          [wallet] = await tx
            .insert(clientWallets)
            .values({
              client_id: clientId,
              balance: '0',
              reserved_balance: '0',
            })
            .returning();
        }

        const balance = Number(wallet.balance) || 0;
        if (!allowNegative && balance < amount) {
          this.logger.error(
            `[CLIENT_DEBIT_TX] Insufficient balance for client ${clientId}. Has: ${balance}, Needs: ${amount}`,
          );
          throw new InsufficientBalanceError();
        }

        await tx
          .update(clientWallets)
          .set({
            balance: sql`${clientWallets.balance} - ${Number(amount)}`,
            updated_at: new Date(),
          })
          .where(eq(clientWallets.id, wallet.id));

        this.logger.log(
          `[CLIENT_DEBIT_TX] Balance subtracted for client ${clientId}`,
        );

        const balanceBefore = Number(wallet.balance) || 0;
        const balanceAfter = balanceBefore - Number(amount);

        const [savedTx] = await tx
          .insert(clientTransactions)
          .values({
            wallet_id: wallet.id,
            amount: String(amount),
            balance_before: String(balanceBefore),
            balance_after: String(balanceAfter),
            type: ClientTransactionType.DEBIT,
            purpose,
            reference_id: referenceId ?? null,
            reference_type: referenceType ?? null,
            metadata: metadata ?? null,
          })
          .returning({ id: clientTransactions.id });

        try {
          const transactionNo = generateTransactionNo(
            'CLIENT',
            purpose as unknown as TransactionPurpose,
            savedTx.id,
          );
          await tx
            .update(clientTransactions)
            .set({ transaction_no: transactionNo })
            .where(eq(clientTransactions.id, savedTx.id));
        } catch (err) {
          this.logger.error(
            `[CLIENT_DEBIT_TX] Failed to generate transaction no: ${(err as Error).message}`,
          );
        }

        if (
          purpose === ClientTransactionPurpose.CONSULTATION ||
          purpose === ClientTransactionPurpose.PRODUCT_PURCHASE ||
          purpose === ClientTransactionPurpose.PUJA_CONFIRMATION
        ) {
          try {
            await tx
              .update(clientAccounts)
              .set({
                total_spending: sql`COALESCE(${clientAccounts.total_spending}, 0) + ${Number(amount)}`,
                updated_at: new Date(),
              })
              .where(eq(clientAccounts.id, clientId));
          } catch (e) {
            this.logger.error(
              `[CLIENT_DEBIT_TX] Spending tracking failed: ${(e as Error).message}`,
            );
          }
        }

        const [refreshed] = await tx
          .select()
          .from(clientWallets)
          .where(eq(clientWallets.client_id, clientId))
          .limit(1);

        if (!refreshed) {
          throw new Error(
            `[CLIENT_DEBIT_TX] Wallet missing after debit for client ${clientId}`,
          );
        }

        return toClientWalletResponse(refreshed) as ClientWallet;
      });
    }

    const qr = externalQueryRunner;

    return this.executeWithQueryRunner(
      qr,
      clientId,
      amount,
      purpose,
      referenceId,
      allowNegative,
      referenceType,
      metadata,
    );
  }

  private async executeWithQueryRunner(
    qr: QueryRunner,
    clientId: number,
    amount: number,
    purpose: ClientTransactionPurpose,
    referenceId?: string,
    allowNegative: boolean = false,
    referenceType?: string,
    metadata?: Record<string, any>,
  ): Promise<ClientWallet> {
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

      const refreshedWallet = await qr.manager.findOne(ClientWallet, {
        where: { client_id: clientId },
      });
      return refreshedWallet as ClientWallet;
    } catch (err) {
      this.logger.error(`[CLIENT_DEBIT_TX] Failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
