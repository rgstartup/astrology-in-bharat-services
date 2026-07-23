import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import * as crypto from 'crypto';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../../infrastructure/entities/withdrawal.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '../../infrastructure/entities/transaction.entity';
import { Wallet, WalletKey } from '../../infrastructure/entities/wallet.entity';
import { Idempotency } from '../../infrastructure/entities/idempotency.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import {
  NotificationType,
  ProfileType,
} from '@/modules/notification/infrastructure/entities/notification.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';

@Injectable()
export class RequestWithdrawalUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationFacade: NotificationFacade,
  ) {}

  async execute(
    profileId: string,
    walletKey: WalletKey,
    amount: number,
    bank_account_id?: string | number,
    idempotencyKey?: string,
    securityMetadata?: { ip?: string; ua?: string },
  ) {
    // 1. Idempotency Check (Pre-transaction)
    const currentPayloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ amount, bank_account_id }))
      .digest('hex');

    if (idempotencyKey) {
      const existingRequest = await this.dataSource
        .getRepository(Idempotency)
        .findOne({
          where: { key: idempotencyKey },
        });

      if (existingRequest) {
        if (existingRequest.payload_hash !== currentPayloadHash) {
          throw new ConflictException(
            'Idempotency Key Conflict: This key was previously used with a different amount or bank account.',
          );
        }
        return existingRequest.response_payload as unknown as Withdrawal;
      }
    }

    // 2. Basic Validations
    if (isNaN(amount) || amount <= 0)
      throw new BadRequestException('Please enter a valid withdrawal amount');

    // Fetch Security Settings
    const keys = [
      'MIN_WITHDRAWAL',
      'DAILY_WITHDRAWAL_LIMIT',
      'MAX_SINGLE_WITHDRAWAL',
      'MONTHLY_WITHDRAWAL_COUNT',
    ];
    const dbSettings = await this.dataSource.getRepository(SystemSetting).find({
      where: { key: In(keys) },
    });

    const getSetting = (key: string, defaultValue: number) => {
      const s = dbSettings.find((x) => x.key === key);
      return s ? Number(s.value) : defaultValue;
    };

    const MIN_WITHDRAWAL = getSetting('MIN_WITHDRAWAL', 500);
    const DAILY_LIMIT = getSetting('DAILY_WITHDRAWAL_LIMIT', 10000);
    const MAX_SINGLE_WITHDRAWAL = getSetting('MAX_SINGLE_WITHDRAWAL', 5000);
    const MAX_MONTHLY_COUNT = getSetting('MONTHLY_WITHDRAWAL_COUNT', 2);

    if (amount < MIN_WITHDRAWAL)
      throw new BadRequestException(
        `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`,
      );

    if (amount > MAX_SINGLE_WITHDRAWAL)
      throw new BadRequestException(
        `Maximum single withdrawal limit is ₹${MAX_SINGLE_WITHDRAWAL}. Please contact support for larger amounts.`,
      );

    // 2.1 KYC / Verification Check
    const walletOwnerId = profileId;
    let ownerIdField = '';
    const profileType: ProfileType =
      walletKey === 'expert_id'
        ? RoleEnum.EXPERT
        : walletKey === 'merchant_id'
          ? RoleEnum.MERCHANT
          : walletKey === 'agent_id'
            ? RoleEnum.AGENT
            : RoleEnum.CLIENT;

    if (walletKey === 'expert_id') {
      const profile_expert = await this.dataSource.getRepository(ProfileExpert).findOne({
        where: { id: profileId },
      });
      if (!profile_expert)
        throw new BadRequestException('Expert profile not found');
      if (profile_expert.kyc_status !== 'approved') {
        throw new BadRequestException(
          'Your KYC is not approved. Please complete verification to withdraw funds.',
        );
      }
      ownerIdField = 'w.expert_id';
    } else if (walletKey === 'merchant_id') {
      const profile_merchant = await this.dataSource.getRepository(ProfileMerchant).findOne({
        where: { id: profileId },
      });
      if (!profile_merchant)
        throw new BadRequestException('Merchant profile not found');
      if (
        profile_merchant.status !== 'active' &&
        !profile_merchant.isVerified
      ) {
        throw new BadRequestException(
          'Your merchant account is not active or verified. Please contact support.',
        );
      }
      ownerIdField = 'w.merchant_id';
    } else if (walletKey === 'agent_id') {
      const agent_profile = await this.dataSource
        .getRepository(ProfileAgent)
        .findOne({ where: { id: profileId } });
      if (!agent_profile)
        throw new BadRequestException('Agent profile not found');
      if (!agent_profile.pan_no || !agent_profile.bank_name) {
        throw new BadRequestException(
          'Please complete your agent profile and bank details to withdraw funds.',
        );
      }
      ownerIdField = 'w.agent_profile_id';
    } else {
      throw new BadRequestException(
        'Clients cannot request withdrawals directly.',
      );
    }

    // 3. Limit Checks (Read-only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTotal: { sum: string | null } | undefined = await this.dataSource
      .getRepository(Withdrawal)
      .createQueryBuilder('w')
      .where(`${ownerIdField} = :walletOwnerId`, { walletOwnerId })
      .andWhere('w.created_at >= :today', { today })
      .andWhere('w.status != :status', { status: WithdrawalStatus.REJECTED })
      .select('SUM(w.amount)', 'sum')
      .getRawOne();

    const currentTotal = Number(dailyTotal?.sum || 0);

    if (currentTotal + amount > DAILY_LIMIT) {
      throw new BadRequestException(
        `Daily withdrawal limit of ₹${DAILY_LIMIT} exceeded. You have already requested ₹${currentTotal} today.`,
      );
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await this.dataSource
      .getRepository(Withdrawal)
      .createQueryBuilder('w')
      .where(`${ownerIdField} = :walletOwnerId`, { walletOwnerId })
      .andWhere('w.created_at >= :startOfMonth', { startOfMonth })
      .andWhere('w.status != :status', { status: WithdrawalStatus.REJECTED })
      .getCount();

    if (monthlyCount >= MAX_MONTHLY_COUNT) {
      throw new BadRequestException(
        `You have already reached the maximum limit of ${MAX_MONTHLY_COUNT} withdrawal requests for this month.`,
      );
    }

    // 4. Start Atomic Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // A. Fetch Wallet with PESSIMISTIC LOCK
      let walletWhere: Record<string, unknown> = {};
      if (walletKey === 'expert_id') walletWhere = { expert_id: walletOwnerId };
      else if (walletKey === 'merchant_id')
        walletWhere = { merchant_id: walletOwnerId };
      else if (walletKey === 'agent_id')
        walletWhere = { agent_id: walletOwnerId };

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: walletWhere,
        lock: { mode: 'pessimistic_write' },
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
      let merchantSnapshot: Record<string, unknown> = {};
      if (bank_account_id) {
        const merchant = await queryRunner.manager.findOne(ProfileMerchant, {
          where: { id: profileId },
        });

        if (
          merchant &&
          merchant.bank_accounts &&
          Array.isArray(merchant.bank_accounts)
        ) {
          const acc = merchant.bank_accounts.find(
            (a: Record<string, unknown>) =>
              String(a.id) === String(bank_account_id),
          );
          if (acc) {
            merchantSnapshot = {
              merchant_bank_name: acc.bank_name,
              merchant_account_number: acc.account_number,
              merchant_ifsc: acc.ifsc_code,
              merchant_account_holder: acc.account_holder,
            };
          }
        }

        if (!merchantSnapshot.merchant_bank_name && bank_account_id) {
          const expertProfile = await queryRunner.manager.findOne(ProfileExpert, {
            where: { id: profileId },
          });
          if (expertProfile) {
            const bankAccount = (await queryRunner.manager.findOne('BankAccount', {
              where: {
                id: bank_account_id as string,
                expert_id: expertProfile.id,
              },
            })) as Record<string, unknown>;
            if (bankAccount) {
              merchantSnapshot = {
                merchant_bank_name: bankAccount.bank_name,
                merchant_account_number: bankAccount.account_number,
                merchant_ifsc: bankAccount.ifsc_code,
                merchant_account_holder: bankAccount.account_holder_name,
              };
            }
          }
        }

        if (!merchantSnapshot.merchant_bank_name)
          throw new BadRequestException('Invalid bank account selected');
      } else {
        // Fallback to legacy profiles
        const merchant = await queryRunner.manager.findOne(ProfileMerchant, {
          where: { id: profileId },
        });

        if (merchant && merchant.bankName) {
          merchantSnapshot = {
            merchant_bank_name: merchant.bankName,
            merchant_account_number: merchant.accountNumber,
            merchant_ifsc: merchant.ifsc,
            merchant_account_holder: merchant.accountHolder || 'N/A',
          };
        } else {
          const agent = await queryRunner.manager.findOne(ProfileAgent, {
            where: { id: profileId },
          });
          if (agent && agent.bank_name) {
            merchantSnapshot = {
              merchant_bank_name: agent.bank_name,
              merchant_account_number: agent.account_number,
              merchant_ifsc: agent.ifsc_code,
              merchant_account_holder: agent.account_holder || 'Agent',
            };
          } else {
            throw new BadRequestException(
              'No bank details found. Please update your profile.',
            );
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
      let dbBankAccountId: string | null = null;
      if (bank_account_id) {
        dbBankAccountId = bank_account_id as string;
      }

      const withdrawalData: Record<string, unknown> = {
        amount,
        status: WithdrawalStatus.PENDING,
        bank_account_id: dbBankAccountId,
        ...merchantSnapshot,
        security_ip: securityMetadata?.ip || null,
        security_user_agent: securityMetadata?.ua || null,
        is_high_value: amount >= HIGH_VALUE_THRESHOLD,
      };

      if (walletKey === 'expert_id') withdrawalData.expert_id = walletOwnerId;
      else if (walletKey === 'merchant_id')
        withdrawalData.merchant_id = walletOwnerId;
      else if (walletKey === 'agent_id')
        withdrawalData.agent_profile_id = walletOwnerId;

      const newWithdrawal = queryRunner.manager.create(Withdrawal, withdrawalData);
      const withdrawal = await queryRunner.manager.save(newWithdrawal);

      // G. Generate Custom IDs (transaction_no and withdrawal_no)
      try {
        const { generateTransactionNo } = await import(
          '@/common/utils/transaction-no.util'
        );
        const rolePrefix = walletKey === 'expert_id' ? 'EXPERT' : walletKey === 'merchant_id' ? 'MERCHANT' : 'AGENT';

        // Update Transaction No
        transaction.transaction_no = generateTransactionNo(
          rolePrefix,
          TransactionPurpose.WITHDRAWAL,
          transaction.id,
        );
        await queryRunner.manager.save(transaction);

        // Update Withdrawal No
        withdrawal.withdrawal_no = generateTransactionNo(
          rolePrefix,
          TransactionPurpose.WITHDRAWAL,
          withdrawal.id,
        );
        await queryRunner.manager.save(withdrawal);

        // Send instant notification
        await this.notificationFacade.create(
          profileId,
          profileType,
          NotificationType.GENERAL,
          'Withdrawal Request Received',
          `A payout request of ₹${amount.toLocaleString('en-IN')} (${withdrawal.withdrawal_no}) has been submitted successfully. It is currently under review by our team.`,
          { withdrawalId: withdrawal.id, amount, status: 'pending' },
        );
      } catch (err) {
        console.error(
          `[RequestWithdrawal] FAILED to generate custom IDs:`,
          err,
        );
      }

      // G. Save Idempotency
      if (idempotencyKey) {
        const idempotency = queryRunner.manager.create(Idempotency, {
          key: idempotencyKey,
          payload_hash: currentPayloadHash,
          response_payload: withdrawal as unknown as Record<string, unknown>,
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
