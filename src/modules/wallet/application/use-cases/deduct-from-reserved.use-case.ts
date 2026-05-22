// @ts-nocheck
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from '../../infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class DeductFromReservedUseCase {
  constructor(private readonly dataSource: DataSource) { }

  async execute(
    userId: string,
    amount: number,
    referenceId: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
    const qr = externalQueryRunner || this.dataSource.createQueryRunner();
    
    if (!externalQueryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      const wallet = await qr.manager.findOne(Wallet, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.reserved_balance) < amount) {
        throw new BadRequestException('Insufficient reserved balance');
      }

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore; // Main balance already deducted during reservation

      wallet.reserved_balance = Number(wallet.reserved_balance) - Number(amount);
      await qr.manager.save(wallet);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.DEBIT,
        purpose: TransactionPurpose.CONSULTATION,
        reference_id: referenceId,
      });
      await qr.manager.save(transaction);

      // --- Tracking Logic ---
      try {
        let clientProfile = await qr.manager.findOne(ProfileClient, {
          where: { id: userId },
          select: ['id']
        });

        if (!clientProfile) {
          clientProfile = qr.manager.create(ProfileClient, { client_id: userId as any });
          clientProfile = await qr.manager.save(ProfileClient, clientProfile);
        }

        await qr.manager.createQueryBuilder()
          .update(ProfileClient)
          .set({ total_spending: () => `COALESCE(total_spending, 0) + ${Number(amount)}` })
          .where('id = :id', { id: clientProfile.id })
          .execute();
      } catch (trackingError) {
        console.error('[DEDUCT_RESERVED_TRACKING] Failed to track client spending:', trackingError);
      }

      if (!externalQueryRunner) {
        await qr.commitTransaction();
      }
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
