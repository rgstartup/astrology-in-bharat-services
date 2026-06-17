import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '../../infrastructure/entities/transaction.entity';

@Injectable()
export class ReleaseReservedUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
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
        where: { [walletKey]: profileId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet || Number(wallet.reserved_balance) < amount) {
        throw new BadRequestException(
          'Insufficient reserved balance to release',
        );
      }

      const balanceBefore = Number(wallet.balance) || 0;
      const balanceAfter = balanceBefore + Number(amount);

      wallet.reserved_balance =
        Number(wallet.reserved_balance) - Number(amount);
      wallet.balance = balanceAfter;
      await qr.manager.save(wallet);

      const transaction = qr.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        type: TransactionType.RELEASE,
        purpose: TransactionPurpose.REFUND,
        reference_id: referenceId,
      });
      await qr.manager.save(transaction);

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
