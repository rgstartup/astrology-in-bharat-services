import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientTransactions,
  clientWallets,
} from '@/core/drizzledb/schema';
import { ClientWallet } from '../entities/client-wallet.entity';
import { ClientTransaction } from '../entities/client-transaction.entity';
import { ClientTransactionType, ClientTransactionPurpose } from '../enum';
import { randomBytes } from 'crypto';

@Injectable()
export class DeductFromClientReservedUseCase {
  private readonly logger = new Logger(DeductFromClientReservedUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    clientId: number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
    // Standalone: Drizzle-owned transaction. An external TypeORM
    // QueryRunner (commerce order flow) keeps the legacy TypeORM path so
    // the deduction stays atomic with the caller's tx.
    if (!externalQueryRunner) {
      await this.db.transaction(async (tx) => {
        this.logger.log(
          `[CLIENT_DEDUCT_RESERVED_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
        );

        const [wallet] = await tx
          .select()
          .from(clientWallets)
          .where(eq(clientWallets.client_id, clientId))
          .limit(1);

        if (!wallet) {
          this.logger.error(
            `[CLIENT_DEDUCT_RESERVED_TX] Wallet not found for client ${clientId}`,
          );
          throw new Error(`Wallet not found for client ${clientId}`);
        }

        const reservedBalance = Number(wallet.reserved_balance) || 0;

        if (reservedBalance < amount) {
          this.logger.error(
            `[CLIENT_DEDUCT_RESERVED_TX] Insufficient reserved balance for client ${clientId}. Reserved: ${reservedBalance}, Needs: ${amount}`,
          );
          throw new Error(
            `Insufficient reserved balance. Reserved: ${reservedBalance}, Required: ${amount}`,
          );
        }

        await tx
          .update(clientWallets)
          .set({
            reserved_balance: sql`${clientWallets.reserved_balance} - ${Number(amount)}`,
            updated_at: new Date(),
          })
          .where(eq(clientWallets.id, wallet.id));

        await tx.insert(clientTransactions).values({
          wallet_id: wallet.id,
          amount: String(amount),
          balance_before: String(Number(wallet.balance) || 0),
          balance_after: String(Number(wallet.balance) || 0),
          type: ClientTransactionType.DEBIT,
          purpose: ClientTransactionPurpose.CONSULTATION,
          reference_id: referenceId,
          reference_type: 'consultation_deduction',
          transaction_no: randomBytes(16).toString('hex'),
        });

        this.logger.log(
          `[CLIENT_DEDUCT_RESERVED_TX] Deducted ${amount} from reserved balance for client ${clientId}`,
        );
      });
      return;
    }

    return this.executeWithQueryRunner(
      externalQueryRunner,
      clientId,
      amount,
      referenceId,
    );
  }

  private async executeWithQueryRunner(
    qr: QueryRunner,
    clientId: number,
    amount: number,
    referenceId: string,
  ): Promise<void> {
    this.logger.log(
      `[CLIENT_DEDUCT_RESERVED_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
    );

    const wallet = await qr.manager.findOne(ClientWallet, {
      where: { client_id: clientId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      this.logger.error(
        `[CLIENT_DEDUCT_RESERVED_TX] Wallet not found for client ${clientId}`,
      );
      throw new Error(`Wallet not found for client ${clientId}`);
    }

    const reservedBalance = Number(wallet.reserved_balance) || 0;

    if (reservedBalance < amount) {
      this.logger.error(
        `[CLIENT_DEDUCT_RESERVED_TX] Insufficient reserved balance for client ${clientId}. Reserved: ${reservedBalance}, Needs: ${amount}`,
      );
      throw new Error(
        `Insufficient reserved balance. Reserved: ${reservedBalance}, Required: ${amount}`,
      );
    }

    await qr.manager
      .createQueryBuilder()
      .update(ClientWallet)
      .set({
        reserved_balance: () => `reserved_balance - ${Number(amount)}`,
      })
      .where('client_id = :clientId', { clientId })
      .execute();

    const transaction = qr.manager.create(ClientTransaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: Number(wallet.balance) || 0,
      balance_after: Number(wallet.balance) || 0,
      type: ClientTransactionType.DEBIT,
      purpose: ClientTransactionPurpose.CONSULTATION,
      reference_id: referenceId,
      reference_type: 'consultation_deduction',
      transaction_no: randomBytes(16).toString('hex'),
    });
    await qr.manager.save(ClientTransaction, transaction);

    this.logger.log(
      `[CLIENT_DEDUCT_RESERVED_TX] Deducted ${amount} from reserved balance for client ${clientId}`,
    );
  }
}
