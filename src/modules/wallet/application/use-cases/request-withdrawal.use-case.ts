import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { Wallet } from '../../infrastructure/persistence/entities/wallet.entity';
import { Idempotency } from '../../infrastructure/persistence/entities/idempotency.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/persistence/entities/system-setting.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationFacade: NotificationFacade,
  ) { }

  async execute(
    userId: number,
    amount: number,
    bank_account_id?: string | number,
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

    // Fetch Security Settings
    const settings = await this.dataSource.getRepository(SystemSetting).find({
      where: { key: crypto.createHash('sha256').update('').digest('hex') } // Dummy to get nothing, wait
    });
    // Let's just fetch them properly
    const keys = ['MIN_WITHDRAWAL', 'DAILY_WITHDRAWAL_LIMIT', 'MAX_SINGLE_WITHDRAWAL', 'MONTHLY_WITHDRAWAL_COUNT'];
    const dbSettings = await this.dataSource.getRepository(SystemSetting).createQueryBuilder('s')
      .where('s.key IN (:...keys)', { keys })
      .getMany();

    const getSetting = (key: string, defaultValue: number) => {
      const s = dbSettings.find(x => x.key === key);
      return s ? Number(s.value) : defaultValue;
    };

    const MIN_WITHDRAWAL = getSetting('MIN_WITHDRAWAL', 500);
    const DAILY_LIMIT = getSetting('DAILY_WITHDRAWAL_LIMIT', 10000);
    const MAX_SINGLE_WITHDRAWAL = getSetting('MAX_SINGLE_WITHDRAWAL', 5000);
    const MAX_MONTHLY_COUNT = getSetting('MONTHLY_WITHDRAWAL_COUNT', 2);

    if (amount < MIN_WITHDRAWAL)
      throw new BadRequestException(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);

    if (amount > MAX_SINGLE_WITHDRAWAL)
      throw new BadRequestException(`Maximum single withdrawal limit is ₹${MAX_SINGLE_WITHDRAWAL}. Please contact support for larger amounts.`);

    // 2.1 KYC / Verification Check
    const { User } = await import('../../../users/infrastructure/persistence/entities/user.entity');
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ['roles', 'profile_expert', 'profile_merchant', 'agent_profile']
    });

    if (!user) throw new BadRequestException('User not found');
    const roles = user.roles.map(r => r.name.toLowerCase());

    if (roles.includes('expert')) {
      if (user.profile_expert?.kyc_status !== 'approved') {
        throw new BadRequestException('Your KYC is not approved. Please complete verification to withdraw funds.');
      }
    } else if (roles.includes('merchant')) {
      if (user.profile_merchant?.status !== 'active' && !user.profile_merchant?.isVerified) {
        throw new BadRequestException('Your merchant account is not active or verified. Please contact support.');
      }
    } else if (roles.includes('agent')) {
      if (!user.agent_profile?.pan_no || !user.agent_profile?.bank_name) {
        throw new BadRequestException('Please complete your agent profile and bank details to withdraw funds.');
      }
    }

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

    if (monthlyCount >= MAX_MONTHLY_COUNT) {
      throw new BadRequestException(`You have already reached the maximum limit of ${MAX_MONTHLY_COUNT} withdrawal requests for this month.`);
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
        const { ProfileMerchant } = await import('../../../merchant/profile/infrastructure/persistence/entities/profile-merchant.entity');
        const merchant = await queryRunner.manager.findOne(ProfileMerchant, { where: { user_id: userId } });
        
        console.log(`[RequestWithdrawal] UserID: ${userId}, Received BankID: ${bank_account_id}, Type: ${typeof bank_account_id}`);

        if (merchant && merchant.bank_accounts && Array.isArray(merchant.bank_accounts)) {
          console.log(`[RequestWithdrawal] Merchant Bank Accounts found: ${merchant.bank_accounts.length}`);
          const acc = merchant.bank_accounts.find((a: any) => {
             console.log(`Comparing: "${a.id}" with "${bank_account_id}"`);
             return String(a.id) === String(bank_account_id);
          });
          if (acc) {
            merchantSnapshot = {
              merchant_bank_name: acc.bank_name,
              merchant_account_number: acc.account_number,
              merchant_ifsc: acc.ifsc_code,
              merchant_account_holder: acc.account_holder
            };
          }
        }

        if (!merchantSnapshot.merchant_bank_name && !isNaN(Number(bank_account_id))) {
          const { BankAccount } = await import('../../../expert/bank-accounts/infrastructure/persistence/entities/bank-account.entity');
          const { ProfileExpert } = await import('../../../expert/profile/infrastructure/persistence/entities/profile-expert.entity');
          const expertProfile = await queryRunner.manager.findOne(ProfileExpert, { where: { user_id: userId } });
          if (expertProfile) {
            const bankAccount = await queryRunner.manager.findOne(BankAccount, {
              where: { id: Number(bank_account_id), expert_id: expertProfile.id }
            });
            if (bankAccount) {
              merchantSnapshot = {
                merchant_bank_name: bankAccount.bank_name,
                merchant_account_number: bankAccount.account_number,
                merchant_ifsc: bankAccount.ifsc_code,
                merchant_account_holder: bankAccount.account_holder_name
              };
            }
          }
        }

        if (!merchantSnapshot.merchant_bank_name) throw new BadRequestException('Invalid bank account selected');
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
      
      // Only save to bank_account_id column if it's a valid numeric database ID (for Experts)
      // For merchants, we store details in merchant_* columns and keep bank_account_id as null
      let dbBankAccountId: number | null = null;
      if (bank_account_id && !isNaN(Number(bank_account_id))) {
         const numericId = Number(bank_account_id);
         // If it's a very large number (like Date.now()), it's a merchant JSON ID, not a DB ID
         if (numericId < 2147483647) { 
            dbBankAccountId = numericId;
         }
      }

      const withdrawal = queryRunner.manager.create(Withdrawal, {
        user_id: userId,
        amount,
        bank_account_id: dbBankAccountId,
        status: WithdrawalStatus.PENDING,
        ip_address: securityMetadata?.ip,
        user_agent: securityMetadata?.ua,
        is_high_value: amount >= HIGH_VALUE_THRESHOLD,
        ...merchantSnapshot,
      });
      await queryRunner.manager.save(withdrawal);

      // G. Generate Custom IDs (transaction_no and withdrawal_no)
      try {
        const { User } = await import('../../../users/infrastructure/persistence/entities/user.entity');
        const { generateTransactionNo } = await import('../../../../common/utils/transaction-no.util');

        const user = await queryRunner.manager.createQueryBuilder(User, 'u')
          .leftJoinAndSelect('u.roles', 'r')
          .where('u.id = :userId', { userId })
          .getOne();
        
        const primaryRole = user?.roles?.[0]?.name || 'user';
        console.log(`[RequestWithdrawal] Generating IDs for role: ${primaryRole}`);
        
        // Update Transaction No
        transaction.transaction_no = generateTransactionNo(primaryRole, TransactionPurpose.WITHDRAWAL, transaction.id);
        console.log(`[RequestWithdrawal] Generated Transaction No: ${transaction.transaction_no}`);
        await queryRunner.manager.save(transaction);

        // Update Withdrawal No
        withdrawal.withdrawal_no = generateTransactionNo(primaryRole, TransactionPurpose.WITHDRAWAL, withdrawal.id);
        console.log(`[RequestWithdrawal] Generated Withdrawal No: ${withdrawal.withdrawal_no}`);
        await queryRunner.manager.save(withdrawal);

        // Send instant notification
        await this.notificationFacade.create(
            userId,
            NotificationType.GENERAL,
            'Withdrawal Request Received',
            `A payout request of ₹${amount.toLocaleString('en-IN')} (${withdrawal.withdrawal_no}) has been submitted successfully. It is currently under review by our team.`,
            { withdrawalId: withdrawal.id, amount, status: 'pending' }
        );
      } catch (err) {
        console.error(`[RequestWithdrawal] FAILED to generate custom IDs:`, err);
      }



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
