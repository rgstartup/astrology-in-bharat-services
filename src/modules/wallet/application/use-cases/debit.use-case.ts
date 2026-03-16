import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { InsufficientBalanceError } from '../../domain/errors/insufficient-balance.error';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';

@Injectable()
export class DebitUseCase {
  private readonly logger = new Logger(DebitUseCase.name);

  constructor(private readonly dataSource: DataSource) { }

  async execute(
    userId: number,
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

    try {
      this.logger.log(`[DEBIT_TX] User: ${userId}, Amount: ${amount}, Reference: ${referenceId}`);

      // 1. Fetch wallet with lock (verify existence)
      const wallet = await qr.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        this.logger.error(`[DEBIT_TX] User ${userId} wallet not found`);
        throw new BadRequestException('Wallet not found');
      }

      const balance = Number(wallet.balance) || 0;
      if (balance < amount) {
        this.logger.error(`[DEBIT_TX] User ${userId} insufficient balance. Has: ${balance}, Needs: ${amount}`);
        throw new InsufficientBalanceError();
      }

      // 2. Perform Atomic Balance Update via QueryBuilder
      // This is the most reliable way to avoid any TypeORM object-state issues
      await qr.manager.createQueryBuilder()
        .update(Wallet)
        .set({ balance: () => `balance - ${Number(amount)}` })
        .where('user_id = :userId', { userId })
        .execute();
      
      this.logger.log(`[DEBIT_TX] Balance subtracted for user ${userId}`);

      // 3. Create Transaction Record
      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount: amount,
        type: TransactionType.DEBIT,
        purpose: purpose,
        reference_id: referenceId,
      });
      await qr.manager.save(Transaction, transaction);

      // 4. Update Client Spending Tracking
      if (purpose === TransactionPurpose.CONSULTATION || purpose === TransactionPurpose.PRODUCT_PURCHASE) {
        try {
          let clientProfile = await qr.manager.findOne(ProfileClient, {
            where: { user_id: userId },
            select: ['id']
          });

          if (!clientProfile) {
            clientProfile = qr.manager.create(ProfileClient, { user_id: userId });
            clientProfile = await qr.manager.save(ProfileClient, clientProfile);
          }

          await qr.manager.createQueryBuilder()
            .update(ProfileClient)
            .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(amount)}` })
            .where('id = :id', { id: clientProfile.id })
            .execute();
        } catch (e) {
          this.logger.error(`[DEBIT_TX] Spending tracking failed: ${e.message}`);
        }
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }

      // Refresh and return
      const refreshedWallet = await qr.manager.findOne(Wallet, { where: { user_id: userId } });
      return refreshedWallet as Wallet;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      this.logger.error(`[DEBIT_TX] Failed: ${err.message}`);
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
