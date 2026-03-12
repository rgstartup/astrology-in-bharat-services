import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { InsufficientBalanceError } from '../../domain/errors/insufficient-balance.error';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';

@Injectable()
export class DebitUseCase {
  constructor(private readonly dataSource: DataSource) { }

  async execute(
    userId: number,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    externalQueryRunner?: any,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const qr = externalQueryRunner || this.dataSource.createQueryRunner();
    
    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      const wallet = await qr.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new InsufficientBalanceError();
      }

      wallet.balance = Number(wallet.balance) - Number(amount);
      await qr.manager.save(wallet);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        purpose,
        reference_id: referenceId,
      });
      await qr.manager.save(transaction);

      // --- NEW: Tracking Logic ---
      if (purpose === TransactionPurpose.CONSULTATION || purpose === TransactionPurpose.PRODUCT_PURCHASE) {
        try {
          // 1. Get or Create Profile
          let clientProfile = await qr.manager.findOne(ProfileClient, {
            where: { user: { id: userId } },
            select: ['id']
          });

          if (!clientProfile) {
             clientProfile = qr.manager.create(ProfileClient, { user: { id: userId } as any, user_id: userId });
             clientProfile = await qr.manager.save(clientProfile);
             console.log(`[DEBIT_TRACKING] Created shell profile for user ${userId} for spending tracking`);
          }

          // 2. Atomic Update
          await qr.manager.createQueryBuilder()
            .update(ProfileClient)
            .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(amount)}` })
            .where('id = :id', { id: clientProfile.id })
            .execute();
          
          console.log(`[DEBIT_TRACKING] Updated total_spending for client ${clientProfile.id} (user ${userId}) with amount ${amount}`);
        } catch (trackingError) {
          console.error('[DEBIT_TRACKING] Failed to track client spending:', trackingError);
        }
      }
      // ---------------------------

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }
      return wallet;
    } catch (err) {
      if (!externalQueryRunner && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw err;
    } finally {
      if (!externalQueryRunner) {
        await qr.release();
      }
    }
  }
}
