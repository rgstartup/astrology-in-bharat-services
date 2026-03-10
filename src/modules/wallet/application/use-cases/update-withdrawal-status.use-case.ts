import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';
import { Transaction, TransactionType, TransactionPurpose } from '../../infrastructure/persistence/entities/transaction.entity';
import { AdminAuditLog } from '@/modules/admin/infrastructure/persistence/entities/admin-audit-log.entity';

@Injectable()
export class UpdateWithdrawalStatusUseCase {
    constructor(
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
        private readonly dataSource: DataSource,
    ) { }

    async execute(id: number, status: WithdrawalStatus, adminId: number, remark?: string) {
        const withdrawal = await this.withdrawalRepository.findOne({
            where: { id },
        });

        if (!withdrawal) {
            throw new NotFoundException('Withdrawal request not found');
        }

        // Only allow status updates if pending, OR if moving from COMPLETED to FAILED (e.g. via webhook)
        const isCurrentlyFinal = withdrawal.status === WithdrawalStatus.COMPLETED ||
            withdrawal.status === WithdrawalStatus.REJECTED ||
            withdrawal.status === WithdrawalStatus.FAILED ||
            withdrawal.status === WithdrawalStatus.CANCELLED;

        if (isCurrentlyFinal && status !== WithdrawalStatus.FAILED) {
            throw new BadRequestException(`Cannot update withdrawal with status: ${withdrawal.status}`);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            withdrawal.status = status;
            withdrawal.admin_id = adminId;
            withdrawal.approval_date = new Date();
            if (remark) withdrawal.remark = remark;

            await queryRunner.manager.save(withdrawal);

            // Trigger refund if moving TO a refund state FROM a non-refund state
            const refundStatuses = [WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED, WithdrawalStatus.CANCELLED];
            const wasRefunded = refundStatuses.includes(withdrawal.status);
            const shouldRefund = refundStatuses.includes(status);

            if (shouldRefund && !wasRefunded) {
                const userId = withdrawal.user_id;

                // Find wallet using manager to stay in transaction
                let wallet = await queryRunner.manager.findOne('Wallet', {
                    where: { user_id: userId }
                }) as any;

                if (wallet) {
                    const amountToRefund = Number(withdrawal.amount);
                    wallet.balance = Number(wallet.balance) + amountToRefund;

                    await queryRunner.manager.save('Wallet', wallet);

                    // Create refund transaction
                    const transaction = queryRunner.manager.create('Transaction', {
                        wallet_id: wallet.id,
                        amount: amountToRefund,
                        type: TransactionType.CREDIT,
                        purpose: TransactionPurpose.REFUND,
                        reference_id: `REFUND-WD-${withdrawal.id}-${status.toUpperCase()}`,
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
