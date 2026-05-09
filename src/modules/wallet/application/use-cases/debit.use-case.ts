import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';
import { InsufficientBalanceError } from '../../domain/errors/insufficient-balance.error';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';


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
    allowNegative: boolean = false,
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
      let wallet = await qr.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        this.logger.log(`[DEBIT_TX] User ${userId} wallet not found. Creating shell wallet...`);
        wallet = qr.manager.create(Wallet, {
          user_id: userId,
          balance: 0,
          reserved_balance: 0,
        });
        wallet = await qr.manager.save(Wallet, wallet);
      }

      const balance = Number(wallet.balance) || 0;
      if (!allowNegative && balance < amount) {
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

      // 3. Create Transaction Record with Snapshots
      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore - Number(amount);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.DEBIT,
        purpose: purpose,
        reference_id: referenceId,
      });
      const savedTx = await qr.manager.save(Transaction, transaction);

      // 3.5 Generate Custom Transaction No
      try {
        const user = await qr.manager.createQueryBuilder(User, 'u')
          .leftJoinAndSelect('u.roles', 'r')
          .where('u.id = :userId', { userId })
          .getOne();
        
        const primaryRole = user?.roles?.[0]?.name || 'user';
        savedTx.transaction_no = generateTransactionNo(primaryRole, purpose, savedTx.id);
        await qr.manager.save(Transaction, savedTx);
      } catch (err) {
        this.logger.error(`[DEBIT_TX] Failed to generate transaction no: ${err.message}`);
      }


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
