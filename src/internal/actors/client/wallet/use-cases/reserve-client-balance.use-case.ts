import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientWallets } from '@/core/drizzledb/schema';
import { ClientWallet } from '../entities/client-wallet.entity';
import { InsufficientBalanceError } from '@/internal/finance/wallet/domain/errors/insufficient-balance.error';

@Injectable()
export class ReserveClientBalanceUseCase {
  private readonly logger = new Logger(ReserveClientBalanceUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    clientId: number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<boolean> {
    // Standalone: Drizzle-owned transaction. An external TypeORM
    // QueryRunner (commerce order flow) keeps the legacy TypeORM path so
    // the reserve stays atomic with the caller's tx.
    if (!externalQueryRunner) {
      return this.db.transaction(async (tx) => {
        this.logger.log(
          `[CLIENT_RESERVE_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
        );

        const [wallet] = await tx
          .select()
          .from(clientWallets)
          .where(eq(clientWallets.client_id, clientId))
          .limit(1);

        const balance = wallet ? Number(wallet.balance) : 0;

        if (!wallet || balance < amount) {
          this.logger.error(
            `[CLIENT_RESERVE_TX] Insufficient balance for client ${clientId}. Has: ${balance}, Needs: ${amount}`,
          );
          throw new InsufficientBalanceError();
        }

        await tx
          .update(clientWallets)
          .set({
            balance: sql`${clientWallets.balance} - ${Number(amount)}`,
            reserved_balance: sql`${clientWallets.reserved_balance} + ${Number(amount)}`,
            updated_at: new Date(),
          })
          .where(eq(clientWallets.id, wallet.id));

        this.logger.log(
          `[CLIENT_RESERVE_TX] Reserved ${amount} for client ${clientId}, reference: ${referenceId}`,
        );

        return true;
      });
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
  ): Promise<boolean> {
    this.logger.log(
      `[CLIENT_RESERVE_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
    );

    const wallet = await qr.manager.findOne(ClientWallet, {
      where: { client_id: clientId },
      lock: { mode: 'pessimistic_write' },
    });

    const balance = wallet ? Number(wallet.balance) : 0;

    if (!wallet || balance < amount) {
      this.logger.error(
        `[CLIENT_RESERVE_TX] Insufficient balance for client ${clientId}. Has: ${balance}, Needs: ${amount}`,
      );
      throw new InsufficientBalanceError();
    }

    await qr.manager
      .createQueryBuilder()
      .update(ClientWallet)
      .set({
        balance: () => `balance - ${Number(amount)}`,
        reserved_balance: () => `reserved_balance + ${Number(amount)}`,
      })
      .where('client_id = :clientId', { clientId })
      .execute();

    this.logger.log(
      `[CLIENT_RESERVE_TX] Reserved ${amount} for client ${clientId}, reference: ${referenceId}`,
    );

    return true;
  }
}
