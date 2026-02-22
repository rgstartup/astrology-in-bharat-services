import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { GetWalletUseCase } from './get-wallet.use-case';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly getWalletUseCase: GetWalletUseCase,
  ) {}

  async execute(
    userId: number,
    amount: number,
    bankAccountId: number,
  ) {
    if (amount < 500)
      throw new BadRequestException('Minimum withdrawal amount is ₹500');

    const wallet = await this.getWalletUseCase.execute(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Debit from wallet
      wallet.balance = Number(wallet.balance) - Number(amount);
      await queryRunner.manager.save(wallet);

      // 2. Create Transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        purpose: TransactionPurpose.WITHDRAWAL,
      });
      await queryRunner.manager.save(transaction);

      // 3. Create Withdrawal record
      const withdrawal = queryRunner.manager.create(Withdrawal, {
        userId,
        amount,
        bankAccountId,
        status: WithdrawalStatus.PENDING,
      });
      await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();
      return withdrawal;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
