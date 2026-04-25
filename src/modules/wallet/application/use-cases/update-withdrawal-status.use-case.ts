import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { AdminAuditLog } from '@/modules/admin/infrastructure/persistence/entities/admin-audit-log.entity';
import { RazorpayPayoutService } from '../../infrastructure/gateways/razorpay-payout.service';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { BankAccount } from '@/modules/expert/bank-accounts/infrastructure/persistence/entities/bank-account.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
    constructor(
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
        private readonly dataSource: DataSource,
        private readonly razorpayPayoutService: RazorpayPayoutService,
    ) { }

    async execute(id: number, status: WithdrawalStatus, adminId: number, remark?: string) {
        const withdrawal = await this.withdrawalRepository.findOne({
            where: { id },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal request not found');
        }

        const oldStatus = withdrawal.status;

        // Only allow status updates if not in a final state
        const isCurrentlyFinal = withdrawal.status === WithdrawalStatus.SUCCESS ||
            withdrawal.status === WithdrawalStatus.COMPLETED ||
            withdrawal.status === WithdrawalStatus.REJECTED ||
            withdrawal.status === WithdrawalStatus.REVERSED ||
            withdrawal.status === WithdrawalStatus.CANCELLED;

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
                let profile: any = await queryRunner.manager.findOne(ProfileExpert, {
                    where: { user_id: withdrawal.user_id },
                    relations: ['user']
                });

                if (!profile) {
                    profile = await queryRunner.manager.findOne('AgentProfile', {
                        where: { user_id: withdrawal.user_id },
                        relations: ['user']
                    });
                }

                if (!profile) throw new BadRequestException('User profile (Expert or Agent) not found');

                // 1. Get or Create Razorpay Contact
                if (!profile.razorpay_contact_id) {
                    profile.razorpay_contact_id = await this.razorpayPayoutService.getOrCreateContact({
                        id: profile.user_id,
                        name: profile.user?.name || 'Partner',
                        email: profile.user?.email || undefined,
                        phone_number: profile.phone_number || profile.phone || undefined
                    });
                    
                    // Save to the correct table
                    const entityName = profile.hasOwnProperty('expert_id') ? ProfileExpert : 'AgentProfile';
                    await queryRunner.manager.save(entityName, profile);
                }


                // 2. Get or Create Fund Account
                const bankAccount = await queryRunner.manager.findOne(BankAccount, {
                    where: { id: withdrawal.bank_account_id }
                });

                if (!bankAccount) throw new BadRequestException('Bank account record missing');

                // Sanitize and Validate bank details
                const accountName = (withdrawal.merchant_account_holder || bankAccount.account_holder_name || '').trim();
                const accountNumber = (withdrawal.merchant_account_number || bankAccount.account_number || '').trim();
                const ifsc = (withdrawal.merchant_ifsc || bankAccount.ifsc_code || '').trim().toUpperCase();

                if (!ifsc || ifsc.length !== 11) {
                    throw new BadRequestException(`Invalid IFSC: "${ifsc}". Razorpay requires exactly 11 characters.`);
                }

                if (!accountNumber) {
                    throw new BadRequestException('Bank account number is missing.');
                }

                if (!bankAccount.razorpay_fund_account_id) {
                    bankAccount.razorpay_fund_account_id = await this.razorpayPayoutService.getOrCreateFundAccount(
                        profile.razorpay_contact_id!,

                        {
                            name: accountName,
                            account: accountNumber,
                            ifsc: ifsc
                        }
                    );
                    await queryRunner.manager.save(BankAccount, bankAccount);
                }

                // 3. Initiate Payout
                const payoutResponse = await this.razorpayPayoutService.initiatePayout(
                    withdrawal.id,
                    Number(withdrawal.amount),
                    bankAccount.razorpay_fund_account_id!
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
                const userId = withdrawal.user_id;
                console.log(`[RefundLogic] Attempting refund for withdrawal ${withdrawal.id}, user ${userId}, amount ${withdrawal.amount}`);

                // Find wallet using manager to stay in transaction
                let wallet = await queryRunner.manager.findOne('Wallet', {
                    where: { user_id: userId }
                }) as any;

                if (wallet) {
                    const balance_before = Number(wallet.balance);
                    const amountToRefund = Number(withdrawal.amount);
                    wallet.balance = balance_before + amountToRefund;
                    const balance_after = wallet.balance;

                    console.log(`[RefundLogic] Wallet found. Balance before: ${balance_before}, Refund: ${amountToRefund}, Balance after: ${balance_after}`);

                    await queryRunner.manager.save('Wallet', wallet);

                    // Create refund transaction (Ledger)
                    const transaction = queryRunner.manager.create('Transaction', {
                        wallet_id: wallet.id,
                        amount: amountToRefund,
                        type: TransactionType.CREDIT,
                        purpose: TransactionPurpose.REFUND,
                        reference_id: `REFUND-WD-${withdrawal.id}-${status.toUpperCase()}`,
                        balance_before,
                        balance_after,
                    }) as any;

                    await queryRunner.manager.save('Transaction', transaction);
                    console.log(`[RefundLogic] Transaction logged. ID: ${transaction.id}`);
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
            return withdrawal;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
