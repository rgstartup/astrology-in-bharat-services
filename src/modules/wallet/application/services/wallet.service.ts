import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '@/modules/wallet/domain/entities/wallet.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '@/modules/wallet/domain/entities/transaction.entity';
import { Withdrawal, WithdrawalStatus } from '@/modules/wallet/domain/entities/withdrawal.entity';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { NotificationGateway } from '@/modules/notification/interfaces/gateways/notification.gateway';
import { NotificationType } from '@/modules/notification/domain/entities/notification.entity';
import { IWalletRepository } from '@/modules/wallet/domain/repositories/wallet.repository.interface';
import { ITransactionRepository } from '@/modules/wallet/domain/repositories/transaction.repository.interface';
import { IWithdrawalRepository } from '@/modules/wallet/domain/repositories/withdrawal.repository.interface';

@Injectable()
export class WalletService {
  constructor(
    @Inject(IWalletRepository)
    private walletRepository: IWalletRepository,
    @Inject(ITransactionRepository)
    private transactionRepository: ITransactionRepository,
    @Inject(IWithdrawalRepository)
    private withdrawalRepository: IWithdrawalRepository,
    private dataSource: DataSource,
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) { }

  async getWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findByUserId(userId);
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

      wallet.balance = Number(wallet.balance) + Number(amount);
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

      // Send notification for recharge
      if (purpose === TransactionPurpose.RECHARGE) {
        const title = 'Wallet Recharged';
        const message = `Your wallet has been credited with ₹${amount}`;

        await this.notificationService.create(
          userId,
          NotificationType.WALLET_RECHARGE,
          title,
          message,
          { amount, referenceId },
        );

        this.notificationGateway.emitToUser(userId, 'wallet_updated', {
          type: 'credit',
          amount,
          title,
          message,
        });
      }

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

      wallet.balance = Number(wallet.balance) - Number(amount);
      wallet.reservedBalance = Number(wallet.reservedBalance) + Number(amount);
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

      wallet.reservedBalance = Number(wallet.reservedBalance) - Number(amount);
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

      wallet.reservedBalance = Number(wallet.reservedBalance) - Number(amount);
      wallet.balance = Number(wallet.balance) + Number(amount);
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

  async getTransactions(
    userId: number,
    page = 1,
    limit = 10,
    type = 'all',
    purpose?: string,
  ) {
    const wallet = await this.getWallet(userId);
    const [items, total] = await this.transactionRepository.findByWalletId(wallet.id, { page, limit, type, purpose });

    return { items, total, page, limit };
  }

  async getTotalEarnings(userId: number): Promise<number> {
    return this.transactionRepository.sumAmount({
      userId,
      type: TransactionType.CREDIT,
    });
  }

  async getGlobalEarnings(): Promise<number> {
    return this.transactionRepository.sumAmount({
      purpose: TransactionPurpose.RECHARGE,
      type: TransactionType.CREDIT,
    });
  }

  async getWithdrawalsStatus(userId: number) {
    const stats = await this.withdrawalRepository.getWithdrawalStats(userId);

    return {
      pendingWithdrawals: stats.pendingSum,
      totalWithdrawn: stats.completedSum,
    };
  }

  async requestWithdrawal(
    userId: number,
    amount: number,
    bankAccountId: number,
  ) {
    if (amount < 500)
      throw new BadRequestException('Minimum withdrawal amount is ₹500');

    const wallet = await this.getWallet(userId);
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
