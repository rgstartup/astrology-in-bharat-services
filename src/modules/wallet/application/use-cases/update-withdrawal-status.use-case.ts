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
                const expert = await queryRunner.manager.findOne(ProfileExpert, {
                    where: { user_id: withdrawal.user_id },
                    relations: ['user']
                });

                if (!expert) throw new BadRequestException('Expert profile not found');

                // 1. Get or Create Razorpay Contact
                if (!expert.razorpay_contact_id) {
                    expert.razorpay_contact_id = await this.razorpayPayoutService.getOrCreateContact({
                        id: expert.user_id,
                        name: expert.user?.name || 'Expert',
                        email: expert.user?.email || undefined,
                        phone_number: expert.phone_number || undefined
                    });
                    await queryRunner.manager.save(ProfileExpert, expert);
                }

                // 2. Get or Create Fund Account
                const bankAccount = await queryRunner.manager.findOne(BankAccount, {
                    where: { id: withdrawal.bank_account_id }
                });

                if (!bankAccount) throw new BadRequestException('Bank account record missing');

                if (!bankAccount.razorpay_fund_account_id) {
                    bankAccount.razorpay_fund_account_id = await this.razorpayPayoutService.getOrCreateFundAccount(
                        expert.razorpay_contact_id!,
                        {
                            name: withdrawal.merchant_account_holder || bankAccount.account_holder_name,
                            account: withdrawal.merchant_account_number || bankAccount.account_number,
                            ifsc: withdrawal.merchant_ifsc || bankAccount.ifsc_code
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
            const wasRefunded = [WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED, WithdrawalStatus.CANCELLED, WithdrawalStatus.REVERSED].includes(withdrawal.status);
            const shouldRefund = refundStatuses.includes(status);

            if (shouldRefund && !wasRefunded) {
                const userId = withdrawal.user_id;

                // Find wallet using manager to stay in transaction
                let wallet = await queryRunner.manager.findOne('Wallet', {
                    where: { user_id: userId }
                }) as any;

                if (wallet) {
                    const balance_before = Number(wallet.balance);
                    const amountToRefund = Number(withdrawal.amount);
                    wallet.balance = balance_before + amountToRefund;
                    const balance_after = wallet.balance;

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
                }
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
