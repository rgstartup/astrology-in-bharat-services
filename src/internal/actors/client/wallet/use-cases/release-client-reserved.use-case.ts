import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientWallets } from '@/core/drizzledb/schema';
import { ClientWallet } from '../entities/client-wallet.entity';

@Injectable()
export class ReleaseClientReservedUseCase {
  private readonly logger = new Logger(ReleaseClientReservedUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    clientId: number,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
    // Standalone: Drizzle-owned transaction. An external TypeORM
    // QueryRunner (commerce order flow) keeps the legacy TypeORM path so
    // the release stays atomic with the caller's tx.
    if (!externalQueryRunner) {
      await this.db.transaction(async (tx) => {
        this.logger.log(
          `[CLIENT_RELEASE_RESERVED_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
        );

        const [wallet] = await tx
          .select()
          .from(clientWallets)
          .where(eq(clientWallets.client_id, clientId))
          .limit(1);

        if (!wallet) {
          this.logger.error(
            `[CLIENT_RELEASE_RESERVED_TX] Wallet not found for client ${clientId}`,
          );
          throw new Error(`Wallet not found for client ${clientId}`);
        }

        const reservedBalance = Number(wallet.reserved_balance) || 0;
        const releaseAmount = Math.min(reservedBalance, amount);

        if (releaseAmount <= 0) {
          this.logger.log(
            `[CLIENT_RELEASE_RESERVED_TX] Nothing to release for client ${clientId}`,
          );
          return;
        }

        await tx
          .update(clientWallets)
          .set({
            reserved_balance: sql`${clientWallets.reserved_balance} - ${releaseAmount}`,
            balance: sql`${clientWallets.balance} + ${releaseAmount}`,
            updated_at: new Date(),
          })
          .where(eq(clientWallets.id, wallet.id));

        this.logger.log(
          `[CLIENT_RELEASE_RESERVED_TX] Released ${releaseAmount} back to balance for client ${clientId}`,
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
      `[CLIENT_RELEASE_RESERVED_TX] Client: ${clientId}, Amount: ${amount}, Reference: ${referenceId}`,
    );

    const wallet = await qr.manager.findOne(ClientWallet, {
      where: { client_id: clientId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      this.logger.error(
        `[CLIENT_RELEASE_RESERVED_TX] Wallet not found for client ${clientId}`,
      );
      throw new Error(`Wallet not found for client ${clientId}`);
    }

    const reservedBalance = Number(wallet.reserved_balance) || 0;
    const releaseAmount = Math.min(reservedBalance, amount);

    if (releaseAmount <= 0) {
      this.logger.log(
        `[CLIENT_RELEASE_RESERVED_TX] Nothing to release for client ${clientId}`,
      );
      return;
    }

    await qr.manager
      .createQueryBuilder()
      .update(ClientWallet)
      .set({
        reserved_balance: () => `reserved_balance - ${releaseAmount}`,
        balance: () => `balance + ${releaseAmount}`,
      })
      .where('client_id = :clientId', { clientId })
      .execute();

    this.logger.log(
      `[CLIENT_RELEASE_RESERVED_TX] Released ${releaseAmount} back to balance for client ${clientId}`,
    );
  }
}
