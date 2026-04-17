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
  ) { }

  async execute(
    userId: number,
    amount: number,
    bank_account_id?: number,
  ) {
    if (amount < 500)
      throw new BadRequestException('Minimum withdrawal amount is ₹500');

    // Check daily limit (₹10,000)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTotal = await this.dataSource.getRepository(Withdrawal)
      .createQueryBuilder('w')
      .where('w.user_id = :userId', { userId })
      .andWhere('w.created_at >= :today', { today })
      .andWhere('w.status != :status', { status: WithdrawalStatus.REJECTED })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const currentTotal = Number(dailyTotal?.sum || 0);
    const DAILY_LIMIT = 10000;

    if (currentTotal + amount > DAILY_LIMIT) {
      throw new BadRequestException(`Daily withdrawal limit of ₹${DAILY_LIMIT} exceeded. You have already requested ₹${currentTotal} today.`);
    }

    // Check monthly request limit (max 2 per month) - Optional, keep for now
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await this.dataSource.getRepository(Withdrawal)
      .createQueryBuilder('w')
      .where('w.user_id = :userId', { userId })
      .andWhere('w.created_at >= :startOfMonth', { startOfMonth })
      .andWhere('w.status != :status', { status: WithdrawalStatus.REJECTED })
      .getCount();

    if (monthlyCount >= 2) {
      throw new BadRequestException('You have already reached the maximum limit of 2 withdrawal requests for this month.');
    }

    const wallet = await this.getWalletUseCase.execute(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance for withdrawal');
    }

    // --- SNAPSHOT LOGIC ---
    let merchantSnapshot: any = {};
    if (!bank_account_id) {
      // Try Merchant Profile
      const { ProfileMerchant } = await import('@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity');
      const profile = await this.dataSource.getRepository(ProfileMerchant).findOne({
        where: { user_id: userId }
      });

      if (profile) {
        if (!profile.bankName || !profile.accountNumber || !profile.ifsc) {
          throw new BadRequestException('Please complete your bank details in profile settings before requesting withdrawal');
        }

        merchantSnapshot = {
          merchant_bank_name: profile.bankName,
          merchant_account_number: profile.accountNumber,
          merchant_ifsc: profile.ifsc,
          merchant_account_holder: profile.accountHolder || 'N/A'
        };
      } else {
        // Try Agent Profile
        const { AgentProfile } = await import('@/modules/agent/infrastructure/persistence/entities/agent-profile.entity');
        const agentProfile = await this.dataSource.getRepository(AgentProfile).findOne({
          where: { user_id: userId }
        });

        if (agentProfile) {
          if (!agentProfile.bank_name || !agentProfile.account_number || !agentProfile.ifsc_code) {
            throw new BadRequestException('Please complete your bank details in profile settings before requesting withdrawal');
          }

          merchantSnapshot = {
            merchant_bank_name: agentProfile.bank_name,
            merchant_account_number: agentProfile.account_number,
            merchant_ifsc: agentProfile.ifsc_code,
            merchant_account_holder: agentProfile.account_holder || 'Agent'
          };
        } else {
          throw new BadRequestException('Profile not found. Please ensure your bank details are completed.');
        }
      }
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
        wallet_id: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        purpose: TransactionPurpose.WITHDRAWAL,
      });
      await queryRunner.manager.save(transaction);

      // 3. Create Withdrawal record
      const withdrawal = queryRunner.manager.create(Withdrawal, {
        user_id: userId,
        amount,
        bank_account_id: bank_account_id || null,
        status: WithdrawalStatus.PENDING,
        ...merchantSnapshot,
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
