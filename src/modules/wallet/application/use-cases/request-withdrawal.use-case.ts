import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Idempotency } from '../../infrastructure/persistence/entities/idempotency.entity';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    private readonly dataSource: DataSource,
  ) { }

  async execute(
    userId: number,
    amount: number,
    bank_account_id?: number,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    // 1. Idempotency Check (Pre-transaction)
    const currentPayloadHash = crypto.createHash('sha256')
      .update(JSON.stringify({ amount, bank_account_id }))
      .digest('hex');

    if (idempotencyKey) {
      const existingRequest = await this.dataSource.getRepository(Idempotency).findOne({
        where: { key: idempotencyKey, user_id: userId }
      });

      if (existingRequest) {
        if (existingRequest.payload_hash !== currentPayloadHash) {
          throw new ConflictException('Idempotency Key Conflict: This key was previously used with a different amount or bank account.');
        }
        return existingRequest.response_payload;
      }
    }

    // 2. Basic Validations
    if (isNaN(amount) || amount <= 0)
      throw new BadRequestException('Please enter a valid withdrawal amount');

    if (amount < 500)
      throw new BadRequestException('Minimum withdrawal amount is ₹500');

    // 3. Limit Checks (Read-only)
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

    // 4. Start Atomic Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // A. Fetch Wallet with PESSIMISTIC LOCK (Critical for preventing double-spend)
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found for this user');
      }

      // B. Verify balance inside the locked transaction
      const balance_before = Number(wallet.balance);
      if (balance_before < amount) {
        throw new BadRequestException('Insufficient balance for withdrawal');
      }

      // C. Capture Snapshot of Bank Details
      let merchantSnapshot: any = {};
      if (bank_account_id) {
        const { BankAccount } = await import('../../../expert/bank-accounts/infrastructure/persistence/entities/bank-account.entity');
        const { ProfileExpert } = await import('../../../expert/profile/infrastructure/persistence/entities/profile-expert.entity');

        const expertProfile = await queryRunner.manager.findOne(ProfileExpert, { where: { user_id: userId } });
        if (!expertProfile) throw new BadRequestException('Expert profile not found');

        const bankAccount = await queryRunner.manager.findOne(BankAccount, {
            where: { id: bank_account_id, expert_id: expertProfile.id }
        });

        if (!bankAccount) throw new BadRequestException('Invalid bank account selected');

        merchantSnapshot = {
          merchant_bank_name: bankAccount.bank_name,
          merchant_account_number: bankAccount.account_number,
          merchant_ifsc: bankAccount.ifsc_code,
          merchant_account_holder: bankAccount.account_holder_name
        };
      } else {
        // Fallback to legacy profiles
        const { ProfileMerchant } = await import('../../../merchant/profile/infrastructure/persistence/entities/profile-merchant.entity');
        const { AgentProfile } = await import('../../../agent/infrastructure/persistence/entities/agent-profile.entity');

        const merchant = await queryRunner.manager.findOne(ProfileMerchant, { where: { user_id: userId } });
        if (merchant && merchant.bankName) {
            merchantSnapshot = {
                merchant_bank_name: merchant.bankName,
                merchant_account_number: merchant.accountNumber,
                merchant_ifsc: merchant.ifsc,
                merchant_account_holder: merchant.accountHolder || 'N/A'
            };
        } else {
            const agent = await queryRunner.manager.findOne(AgentProfile, { where: { user_id: userId } });
            if (agent && agent.bank_name) {
                merchantSnapshot = {
                    merchant_bank_name: agent.bank_name,
                    merchant_account_number: agent.account_number,
                    merchant_ifsc: agent.ifsc_code,
                    merchant_account_holder: agent.account_holder || 'Agent'
                };
            } else {
                throw new BadRequestException('No bank details found. Please update your profile.');
            }
        }
      }

      // D. Debit Wallet
      wallet.balance = balance_before - amount;
      const balance_after = wallet.balance;
      await queryRunner.manager.save(wallet);

      // E. Create Transaction Record (Ledger)
      const transaction = queryRunner.manager.create(Transaction, {
        wallet_id: wallet.id,
        amount,
        type: TransactionType.DEBIT,
        purpose: TransactionPurpose.WITHDRAWAL,
        balance_before,
        balance_after,
      });
      await queryRunner.manager.save(transaction);

      // F. Create Withdrawal Record
      const HIGH_VALUE_THRESHOLD = 5000;
      const withdrawal = queryRunner.manager.create(Withdrawal, {
        user_id: userId,
        amount,
        bank_account_id: bank_account_id || null,
        status: WithdrawalStatus.PENDING,
        ip_address: securityMetadata?.ip,
        user_agent: securityMetadata?.ua,
        is_high_value: amount >= HIGH_VALUE_THRESHOLD,
        ...merchantSnapshot,
      });
      await queryRunner.manager.save(withdrawal);

      // G. Save Idempotency
      if (idempotencyKey) {
        const idempotency = queryRunner.manager.create(Idempotency, {
          key: idempotencyKey,
          user_id: userId,
          payload_hash: currentPayloadHash,
          response_payload: withdrawal,
        });
        await queryRunner.manager.save(idempotency);
      }

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
