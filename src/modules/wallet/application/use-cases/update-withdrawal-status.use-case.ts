// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/entities/withdrawal.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/entities/transaction.entity';
import { AdminAuditLog } from '@/modules/admin/infrastructure/entities/admin-audit-log.entity';
import { RazorpayPayoutService } from '../../infrastructure/gateways/razorpay-payout.service';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { BankAccount } from '@/modules/expert/bank-accounts/infrastructure/entities/bank-account.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
    constructor(
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
        private readonly dataSource: DataSource,
        private readonly razorpayPayoutService: RazorpayPayoutService,
        private readonly notificationFacade: NotificationFacade,
    ) { }

    async execute(id: string, status: WithdrawalStatus, adminId: string, remark?: string) {
        const withdrawal = await this.withdrawalRepository.findOne({
            where: { id },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal request not found');
        }

        const oldStatus = withdrawal.status;

        // Only allow status updates if not in a final state
        // const isCurrentlyFinal = withdrawal.status === WithdrawalStatus.SUCCESS ||
        //     withdrawal.status === WithdrawalStatus.COMPLETED ||
        //     withdrawal.status === WithdrawalStatus.REJECTED ||
        //     withdrawal.status === WithdrawalStatus.REVERSED ||
        //     withdrawal.status === WithdrawalStatus.CANCELLED;

        const isCurrentlyFinal = [WithdrawalStatus.SUCCESS, WithdrawalStatus.COMPLETED, WithdrawalStatus.REJECTED, WithdrawalStatus.REVERSED, WithdrawalStatus.CANCELLED].includes(withdrawal.status);

        if (isCurrentlyFinal) {
            throw new BadRequestException(`Cannot update withdrawal with final status: ${withdrawal.status}`);
        }

        // Specific Transition Rules:
        if (withdrawal.status === WithdrawalStatus.PENDING && 
            ![WithdrawalStatus.APPROVED, WithdrawalStatus.REJECTED, WithdrawalStatus.CANCELLED].includes(status)) {
            throw new BadRequestException('Pending requests can only be Approved, Rejected, or Cancelled');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let finalStatus = status;

            // --- AUTO PAYOUT INTEGRATION ---
            if (status === WithdrawalStatus.APPROVED) {
                // Try to find either Expert or Agent profile
                let profile: any = null;
                if (withdrawal.expert_id) {
                    profile = await queryRunner.manager.findOne(ProfileExpert, {
                        where: { id: withdrawal.expert_id },
                        relations: ['user']
                    });
                } else if (withdrawal.agent_profile_id) {
                    profile = await queryRunner.manager.findOne('ProfileAgent', {
                        where: { id: withdrawal.agent_profile_id },
                        relations: ['user']
                    });
                } else if (withdrawal.merchant_id) {
                    profile = await queryRunner.manager.findOne(ProfileMerchant, {
                        where: { id: withdrawal.merchant_id },
                        relations: ['user']
                    });
                }

                if (!profile) throw new BadRequestException('User profile (Expert, Agent or Merchant) not found');

                // 1. Get or Create Razorpay Contact
                if (!profile.razorpay_contact_id) {
                    profile.razorpay_contact_id = await this.razorpayPayoutService.getOrCreateContact({
                        id: profile.user_id,
                        name: profile.user?.name || 'Partner',
                        email: profile.user?.email || undefined,
                        phone_number: profile.phone_number || profile.phone || undefined
                    });
                    
                    // Save to the correct table
                    let entityToSave: any = ProfileExpert;
                    if (profile.hasOwnProperty('agent_id')) entityToSave = 'ProfileAgent';
                    if (profile.hasOwnProperty('business_name') || profile.hasOwnProperty('merchant_id')) entityToSave = ProfileMerchant;
                    
                    await queryRunner.manager.save(entityToSave, profile);
                }


                // 2. Get or Create Fund Account
                let bankAccount: any = null;
                if (withdrawal.bank_account_id) {
                    bankAccount = await queryRunner.manager.findOne(BankAccount, {
                        where: { id: withdrawal.bank_account_id }
                    });
                }

                // Sanitize and Validate bank details (prefer snapshot from withdrawal record)
                const accountName = (withdrawal.merchant_account_holder || bankAccount?.account_holder_name || '').trim();
                const accountNumber = (withdrawal.merchant_account_number || bankAccount?.account_number || '').trim();
                const ifsc = (withdrawal.merchant_ifsc || bankAccount?.ifsc_code || '').trim().toUpperCase();

                if (!accountName || !accountNumber || !ifsc) {
                    throw new BadRequestException(`Missing bank details. Name: ${accountName ? 'OK' : 'MISSING'}, Acc: ${accountNumber ? 'OK' : 'MISSING'}, IFSC: ${ifsc ? 'OK' : 'MISSING'}`);
                }

                if (ifsc.length !== 11) {
                    throw new BadRequestException(`Invalid IFSC: "${ifsc}". Razorpay requires exactly 11 characters.`);
                }

                if (!bankAccount || !bankAccount.razorpay_fund_account_id) {
                    // Create fund account on the fly if not already saved in a BankAccount record
                    const fundAccountId = await this.razorpayPayoutService.getOrCreateFundAccount(
                        profile.razorpay_contact_id!,
                        {
                            name: accountName,
                            account: accountNumber,
                            ifsc: ifsc
                        }
                    );

                    // If we have a permanent BankAccount record, save the fund account ID there
                    if (bankAccount) {
                        bankAccount.razorpay_fund_account_id = fundAccountId;
                        await queryRunner.manager.save(BankAccount, bankAccount);
                    }
                    
                    // Temporary variable for the initiation step
                    withdrawal['temp_fund_account_id'] = fundAccountId;
                } else {
                    withdrawal['temp_fund_account_id'] = bankAccount.razorpay_fund_account_id;
                }

                // 3. Initiate Payout
                const payoutResponse = await this.razorpayPayoutService.initiatePayout(
                    withdrawal.id,
                    Number(withdrawal.amount),
                    withdrawal['temp_fund_account_id']
                );

                // If we reach here, payout has been accepted by gateway
                finalStatus = WithdrawalStatus.PROCESSING;
                withdrawal.transaction_reference = payoutResponse.id;
                withdrawal.remark = `[Razorpay ID: ${payoutResponse.id}] ${remark || ''}`;
            }

            withdrawal.status = finalStatus;
            withdrawal.admin_id = adminId;
            withdrawal.approval_date = new Date();
            if (remark && !withdrawal.remark?.includes(remark)) {
                withdrawal.remark = `${remark} | ${withdrawal.remark || ''}`;
            }

            await queryRunner.manager.save(withdrawal);

            // Trigger refund if moving TO a refund state FROM a non-refund state
            const refundStatuses = [WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED, WithdrawalStatus.CANCELLED, WithdrawalStatus.REVERSED];
            const wasRefunded = [WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED, WithdrawalStatus.CANCELLED, WithdrawalStatus.REVERSED].includes(oldStatus);

            const shouldRefund = refundStatuses.includes(status);

            if (shouldRefund && !wasRefunded) {
                const profileId = withdrawal.expert_id || withdrawal.merchant_id || withdrawal.agent_profile_id;
                console.log(`[RefundLogic] Attempting refund for withdrawal ${withdrawal.id}, profile ${profileId}, amount ${withdrawal.amount}`);

                let walletWhere: any = {};
                if (withdrawal.expert_id) walletWhere = { expert_id: withdrawal.expert_id };
                else if (withdrawal.merchant_id) walletWhere = { merchant_id: withdrawal.merchant_id };
                else if (withdrawal.agent_profile_id) walletWhere = { agent_id: withdrawal.agent_profile_id };

                // Find wallet using manager to stay in transaction
                let wallet = await queryRunner.manager.findOne('Wallet', {
                    where: walletWhere
                }) as any;

                if (wallet) {
                    const balance_before = Number(wallet.balance);
                    const amountToRefund = Number(withdrawal.amount);
                    wallet.balance = balance_before + amountToRefund;
                    const balance_after = wallet.balance;

                    console.log(`[RefundLogic] Wallet found. Balance before: ${balance_before}, Refund: ${amountToRefund}, Balance after: ${balance_after}`);

                    await queryRunner.manager.save('Wallet', wallet);

                    // Create refund transaction (Ledger)
                    const { generateTransactionNo } = await import('../../../../common/utils/transaction-no.util');
                    const transaction = queryRunner.manager.create(Transaction, {
                        wallet_id: wallet.id,
                        amount: amountToRefund,
                        type: TransactionType.CREDIT,
                        purpose: TransactionPurpose.REFUND,
                        reference_id: `REFUND-WD-${withdrawal.id}`,
                        balance_before,
                        balance_after,
                        // Note: If you want to show the admin remark, we can prepend it to the reference_id 
                        // or just rely on the withdrawal record which we'll fetch in the mapper.
                    });

                    await queryRunner.manager.save(Transaction, transaction);

                                        
                    
                    // Generate a nice Transaction No for the refund
                    transaction.transaction_no = generateTransactionNo('MERCHANT', TransactionPurpose.REFUND, transaction.id);
                    await queryRunner.manager.save('Transaction', transaction);
                    
                    console.log(`[RefundLogic] Transaction logged. No: ${transaction.transaction_no}`);
                } else {
                    console.warn(`[RefundLogic] Wallet not found for user ${userId}`);
                }
            } else {
                console.log(`[RefundLogic] Refund skipped. shouldRefund: ${shouldRefund}, wasRefunded: ${wasRefunded}`);
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
                    remark: remark
                }
            });
            await queryRunner.manager.save(AdminAuditLog, auditLog);

            await queryRunner.commitTransaction();

            // Send notification after successful transaction commit
            try {
                let title = 'Payout Update';
                let message = `Your withdrawal status has been updated to ${status}.`;

                if (status === WithdrawalStatus.PROCESSING || status === WithdrawalStatus.APPROVED) {
                    title = 'Payout Approved';
                    message = `Great news! Your payout request of ₹${Number(withdrawal.amount).toLocaleString('en-IN')} has been approved and is being processed.`;
                } else if (status === WithdrawalStatus.COMPLETED || status === WithdrawalStatus.SUCCESS) {
                    title = 'Payout Successful';
                    message = `Your payout of ₹${Number(withdrawal.amount).toLocaleString('en-IN')} has been successfully transferred to your bank account.`;
                } else if ([WithdrawalStatus.REJECTED, WithdrawalStatus.CANCELLED, WithdrawalStatus.FAILED, WithdrawalStatus.REVERSED].includes(status)) {
                    title = 'Payout Rejected/Refunded';
                    message = `Your payout request of ₹${Number(withdrawal.amount).toLocaleString('en-IN')} was rejected/cancelled. Reason: ${remark || 'N/A'}. The amount has been refunded to your wallet.`;
                }

                let userId = '';
                if (withdrawal.expert_id) {
                    const expert = await queryRunner.manager.findOne(ProfileExpert, { where: { id: withdrawal.expert_id } });
                    if(expert) userId = expert.user_id;
                } else if (withdrawal.merchant_id) {
                    const merchant = await queryRunner.manager.findOne(ProfileMerchant, { where: { id: withdrawal.merchant_id } });
                    if(merchant) userId = merchant.user_id;
                } else if (withdrawal.agent_profile_id) {
                    const agent = await queryRunner.manager.findOne('ProfileAgent', { where: { id: withdrawal.agent_profile_id } });
                    if(agent) userId = (agent as any).user_id;
                }

                if (userId) {
                    await this.notificationFacade.create(
                        userId as any,
                        NotificationType.GENERAL,
                        title,
                        message,
                        { withdrawalId: withdrawal.id, status, amount: withdrawal.amount }
                    );
                }

            } catch (notifyErr) {
                console.error(`[UpdateWithdrawalStatus] Notification FAILED:`, notifyErr);
            }

            return withdrawal;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}

