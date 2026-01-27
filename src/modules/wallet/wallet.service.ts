import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from './entities/transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) { }

  async getWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        balance: 0,
        reservedBalance: 0,
      });
      await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: number): Promise<number> {
    const wallet = await this.getWallet(userId);
    return Number(wallet.balance);
  }

  async validateBalance(userId: number, minAmount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= minAmount;
  }

  async topUp(
    userId: number,
    amount: number,
    referenceId?: string,
  ): Promise<Wallet> {
    return this.credit(
      userId,
      amount,
      TransactionPurpose.RECHARGE,
      referenceId,
    );
  }

  async credit(
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
      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, {
          userId,
          balance: 0,
          reservedBalance: 0,
        });
      }

      wallet.balance = Number(wallet.balance) + amount;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.CREDIT,
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

  async debit(
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
        throw new BadRequestException('Insufficient balance');
      }

      wallet.balance = Number(wallet.balance) - amount;
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

  async reserveBalance(
    userId: number,
    amount: number,
    referenceId: string,
  ): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      wallet.balance = Number(wallet.balance) - amount;
      wallet.reservedBalance = Number(wallet.reservedBalance) + amount;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.HOLD,
        purpose: TransactionPurpose.CONSULTATION,
        referenceId,
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

  async deductFromReserved(
    userId: number,
    amount: number,
    referenceId: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.reservedBalance) < amount) {
        throw new BadRequestException('Insufficient reserved balance');
      }

      wallet.reservedBalance = Number(wallet.reservedBalance) - amount;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        purpose: TransactionPurpose.CONSULTATION,
        referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseReserved(
    userId: number,
    amount: number,
    referenceId: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet || Number(wallet.reservedBalance) < amount) {
        throw new BadRequestException(
          'Insufficient reserved balance to release',
        );
      }

      wallet.reservedBalance = Number(wallet.reservedBalance) - amount;
      wallet.balance = Number(wallet.balance) + amount;
      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        amount,
        type: TransactionType.RELEASE,
        purpose: TransactionPurpose.REFUND,
        referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
