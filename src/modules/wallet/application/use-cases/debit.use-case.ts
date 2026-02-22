import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { InsufficientBalanceError } from '../../domain/errors/insufficient-balance.error';

@Injectable()
export class DebitUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(
    userId: number,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new InsufficientBalanceError();
      }

      wallet.balance = Number(wallet.balance) - Number(amount);
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        purpose,
        referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return wallet;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
