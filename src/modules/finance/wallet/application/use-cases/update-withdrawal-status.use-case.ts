import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../../infrastructure/entities/withdrawal.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '../../infrastructure/entities/transaction.entity';
import { RazorpayPayoutService } from '../../infrastructure/gateways/razorpay-payout.service';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { AdminAuditLog } from '@/modules/admin/infrastructure/entities/admin-audit-log.entity';
import {
  NotificationType,
  ProfileType,
} from '@/modules/notification/infrastructure/entities/notification.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    private readonly dataSource: DataSource,
    private readonly razorpayPayoutService: RazorpayPayoutService,
    private readonly notificationFacade: NotificationFacade,
  ) {}

  async execute(
    id: string,
    status: WithdrawalStatus,
    adminId: string,
    remark?: string,
  ) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    const oldStatus = withdrawal.status;

    const isCurrentlyFinal = [
      WithdrawalStatus.SUCCESS,
      WithdrawalStatus.COMPLETED,
      WithdrawalStatus.REJECTED,
      WithdrawalStatus.REVERSED,
      WithdrawalStatus.CANCELLED,
    ].includes(withdrawal.status);

    if (isCurrentlyFinal) {
      throw new BadRequestException(
        `Cannot update withdrawal with final status: ${withdrawal.status}`,
      );
    }

    // Specific Transition Rules:
    if (
      withdrawal.status === WithdrawalStatus.PENDING &&
      ![
        WithdrawalStatus.APPROVED,
        WithdrawalStatus.REJECTED,
        WithdrawalStatus.CANCELLED,
      ].includes(status)
    ) {
      throw new BadRequestException(
        'Pending requests can only be Approved, Rejected, or Cancelled',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let finalStatus = status;

      // --- AUTO PAYOUT INTEGRATION ---
      if (status === WithdrawalStatus.APPROVED) {
        // Try to find either Expert or Agent profile (read inside transaction)
        type ProfileInfo = {
          id: string;
          user_id: string;
          razorpay_contact_id?: string;
          phone_number?: string;
          phone?: string;
        };
        type UserInfo = { id: string; name?: string; email?: string };
        let profile: ProfileInfo | null = null;
        let user: UserInfo | null = null;

        if (withdrawal.expert_id) {
          profile = (await queryRunner.manager.findOne(ProfileExpert, {
            where: { id: withdrawal.expert_id },
          })) as unknown as ProfileInfo;
        } else if (withdrawal.agent_profile_id) {
          profile = (await queryRunner.manager.findOne(ProfileAgent, {
            where: { id: withdrawal.agent_profile_id },
          })) as unknown as ProfileInfo;
        } else if (withdrawal.merchant_id) {
          profile = (await queryRunner.manager.findOne(ProfileMerchant, {
            where: { id: withdrawal.merchant_id },
          })) as unknown as ProfileInfo;
        }

        if (!profile)
          throw new BadRequestException(
            'User profile (Expert, Agent or Merchant) not found',
          );

        user = (await queryRunner.manager.findOne(User, {
          where: { id: profile.user_id },
        })) as unknown as UserInfo;

        // 1. Get or Create Razorpay Contact
        if (!profile.razorpay_contact_id) {
          const newContactId =
            await this.razorpayPayoutService.getOrCreateContact({
              id: profile.user_id,
              name: user?.name || 'Partner',
              email: user?.email || undefined,
              phone_number: profile.phone_number || profile.phone || undefined,
            });

          // Save to the correct table via queryRunner
          if (withdrawal.expert_id) {
            await queryRunner.manager.update(
              ProfileExpert,
              { id: profile.id },
              { razorpay_contact_id: newContactId },
            );
          } else if (withdrawal.merchant_id) {
            await queryRunner.manager.update(
              ProfileMerchant,
              { id: profile.id },
              { razorpay_contact_id: newContactId },
            );
          } else if (withdrawal.agent_profile_id) {
            await queryRunner.manager.update(
              'ProfileAgent',
              { id: profile.id },
              { razorpay_contact_id: newContactId },
            );
          }

          profile.razorpay_contact_id = newContactId;
        }

        // 2. Get or Create Fund Account
        type BankAccountInfo = {
          id?: string;
          account_holder_name?: string;
          account_number?: string;
          ifsc_code?: string;
          razorpay_fund_account_id?: string;
        };
        let bankAccount: BankAccountInfo | null = null;
        if (withdrawal.bank_account_id) {
          bankAccount = (await queryRunner.manager.findOne('BankAccount', {
            where: { id: withdrawal.bank_account_id },
          })) as unknown as BankAccountInfo;
        }

        // Sanitize and Validate bank details (prefer snapshot from withdrawal record)
        const accountName = String(
          withdrawal.merchant_account_holder ||
            bankAccount?.account_holder_name ||
            '',
        ).trim();
        const accountNumber = String(
          withdrawal.merchant_account_number ||
            bankAccount?.account_number ||
            '',
        ).trim();
        const ifsc = String(
          withdrawal.merchant_ifsc || bankAccount?.ifsc_code || '',
        )
          .trim()
          .toUpperCase();

        if (!accountName || !accountNumber || !ifsc) {
          throw new BadRequestException(
            `Missing bank details. Name: ${accountName ? 'OK' : 'MISSING'}, Acc: ${accountNumber ? 'OK' : 'MISSING'}, IFSC: ${ifsc ? 'OK' : 'MISSING'}`,
          );
        }

        if (ifsc.length !== 11) {
          throw new BadRequestException(
            `Invalid IFSC: "${ifsc}". Razorpay requires exactly 11 characters.`,
          );
        }

        let tempFundAccountId = '';

        if (!bankAccount || !bankAccount.razorpay_fund_account_id) {
          // Create fund account on the fly
          const fundAccountId =
            await this.razorpayPayoutService.getOrCreateFundAccount(
              profile.razorpay_contact_id,
              {
                name: accountName,
                account: accountNumber,
                ifsc: ifsc,
              },
            );

          // If we have a permanent BankAccount record, save the fund account ID there
          if (bankAccount) {
            await queryRunner.manager.update(
              'BankAccount',
              { id: bankAccount.id },
              { razorpay_fund_account_id: fundAccountId },
            );
          }

          tempFundAccountId = fundAccountId;
        } else {
          tempFundAccountId = bankAccount.razorpay_fund_account_id;
        }

        // 3. Initiate Payout
        const payoutResponse = await this.razorpayPayoutService.initiatePayout(
          withdrawal.id,
          Number(withdrawal.amount),
          tempFundAccountId,
        );

        // If we reach here, payout has been accepted by gateway
        finalStatus = WithdrawalStatus.PROCESSING;
        withdrawal.transaction_reference = payoutResponse.id as string;
        withdrawal.remark = `[Razorpay ID: ${payoutResponse.id as string}] ${remark || ''}`;
      }

      withdrawal.status = finalStatus;
      withdrawal.admin_id = adminId;
      withdrawal.approval_date = new Date();
      if (remark && !withdrawal.remark?.includes(remark)) {
        withdrawal.remark = `${remark} | ${withdrawal.remark || ''}`;
      }

      await queryRunner.manager.save(withdrawal);

      // Trigger refund if moving TO a refund state FROM a non-refund state
      const refundStatuses = [
        WithdrawalStatus.REJECTED,
        WithdrawalStatus.FAILED,
        WithdrawalStatus.CANCELLED,
        WithdrawalStatus.REVERSED,
      ];
      const wasRefunded = [
        WithdrawalStatus.REJECTED,
        WithdrawalStatus.FAILED,
        WithdrawalStatus.CANCELLED,
        WithdrawalStatus.REVERSED,
      ].includes(oldStatus);

      const shouldRefund = refundStatuses.includes(status);

      if (shouldRefund && !wasRefunded) {
        const profileId =
          withdrawal.expert_id ||
          withdrawal.merchant_id ||
          withdrawal.agent_profile_id;
        console.log(
          `[RefundLogic] Attempting refund for withdrawal ${withdrawal.id}, profile ${profileId}, amount ${withdrawal.amount}`,
        );

        let walletWhere: Record<string, unknown> = {};
        if (withdrawal.expert_id)
          walletWhere = { expert_id: withdrawal.expert_id };
        else if (withdrawal.merchant_id)
          walletWhere = { merchant_id: withdrawal.merchant_id };
        else if (withdrawal.agent_profile_id)
          walletWhere = { agent_id: withdrawal.agent_profile_id };

        // Find wallet using manager to stay in transaction
        const wallet = (await queryRunner.manager.findOne('Wallet', {
          where: walletWhere as import('typeorm').FindOptionsWhere<unknown>,
        })) as Record<string, unknown>;

        if (wallet) {
          const balance_before = Number(wallet.balance);
          const amountToRefund = Number(withdrawal.amount);
          const balance_after = balance_before + amountToRefund;
          wallet.balance = balance_after;

          console.log(
            `[RefundLogic] Wallet found. Balance before: ${balance_before}, Refund: ${amountToRefund}, Balance after: ${balance_after}`,
          );

          await queryRunner.manager.save('Wallet', wallet);

          // Create refund transaction (Ledger)
          const { generateTransactionNo } = await import(
            '@/common/utils/transaction-no.util'
          );
          const transaction = queryRunner.manager.create(Transaction, {
            wallet_id: wallet.id as string,
            amount: amountToRefund,
            type: TransactionType.CREDIT,
            purpose: TransactionPurpose.REFUND,
            reference_id: `REFUND-WD-${withdrawal.id}`,
            balance_before,
            balance_after,
          });

          await queryRunner.manager.save(Transaction, transaction);

          // Generate a nice Transaction No for the refund
          transaction.transaction_no = generateTransactionNo(
            withdrawal.expert_id ? 'EXPERT' : withdrawal.merchant_id ? 'MERCHANT' : 'AGENT',
            TransactionPurpose.REFUND,
            transaction.id,
          );
          await queryRunner.manager.save('Transaction', transaction);

          console.log(
            `[RefundLogic] Transaction logged. No: ${transaction.transaction_no}`,
          );
        } else {
          console.warn(
            `[RefundLogic] Wallet not found for profile ${profileId}`,
          );
        }
      } else {
        console.log(
          `[RefundLogic] Refund skipped. shouldRefund: ${shouldRefund}, wasRefunded: ${wasRefunded}`,
        );
      }

      // Create Admin Audit Log
      const auditLog = queryRunner.manager.create(AdminAuditLog, {
        admin_id: adminId,
        action: `${status.toUpperCase()}_WITHDRAWAL`,
        resource_type: 'WITHDRAWAL',
        resource_id: id.toString(),
        details: {
          previous_status: withdrawal.status,
          new_status: status,
          amount: withdrawal.amount,
          remark: remark,
        },
      });
      await queryRunner.manager.save(AdminAuditLog, auditLog);

      await queryRunner.commitTransaction();

      // Send notification after successful transaction commit
      try {
        let title = 'Payout Update';
        let message = `Your withdrawal status has been updated to ${status}.`;

        if (
          status === WithdrawalStatus.PROCESSING ||
          status === WithdrawalStatus.APPROVED
        ) {
          title = 'Payout Approved';
          message = `Great news! Your payout request of ₹${Number(withdrawal.amount).toLocaleString('en-IN')} has been approved and is being processed.`;
        } else if (
          status === WithdrawalStatus.COMPLETED ||
          status === WithdrawalStatus.SUCCESS
        ) {
          title = 'Payout Successful';
          message = `Your payout of ₹${Number(withdrawal.amount).toLocaleString('en-IN')} has been successfully transferred to your bank account.`;
        } else if (
          [
            WithdrawalStatus.REJECTED,
            WithdrawalStatus.CANCELLED,
            WithdrawalStatus.FAILED,
            WithdrawalStatus.REVERSED,
          ].includes(status)
        ) {
          title = 'Payout Rejected/Refunded';
          message = `Your payout request of ₹${Number(withdrawal.amount).toLocaleString('en-IN')} was rejected/cancelled. Reason: ${remark || 'N/A'}. The amount has been refunded to your wallet.`;
        }

        let notifyProfileId: string | null = null;
        let notifyProfileType: ProfileType | null = null;
        if (withdrawal.expert_id) {
          notifyProfileId = withdrawal.expert_id;
          notifyProfileType = RoleEnum.EXPERT;
        } else if (withdrawal.merchant_id) {
          notifyProfileId = withdrawal.merchant_id;
          notifyProfileType = RoleEnum.MERCHANT;
        } else if (withdrawal.agent_profile_id) {
          notifyProfileId = withdrawal.agent_profile_id;
          notifyProfileType = RoleEnum.AGENT;
        }

        if (notifyProfileId && notifyProfileType) {
          await this.notificationFacade.create(
            notifyProfileId,
            notifyProfileType,
            NotificationType.GENERAL,
            title,
            message,
            { withdrawalId: withdrawal.id, status, amount: withdrawal.amount },
          );
        }
      } catch (notifyErr) {
        console.error(
          `[UpdateWithdrawalStatus] Notification FAILED:`,
          notifyErr,
        );
      }

      return new BooleanMessage();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
