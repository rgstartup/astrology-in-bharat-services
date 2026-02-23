import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { InsufficientBalanceError } from '../../domain/errors/insufficient-balance.error';

@Injectable()
export class ReserveBalanceUseCase {
  constructor(private readonly dataSource: DataSource) { }

  async execute(
    userId: number,
    amount: number,
    referenceId: string,
  ): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new InsufficientBalanceError();
      }

      wallet.balance = Number(wallet.balance) - Number(amount);
      wallet.reserved_balance = Number(wallet.reserved_balance) + Number(amount);
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        type: TransactionType.HOLD,
        purpose: TransactionPurpose.CONSULTATION,
        reference_id: referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return true;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
