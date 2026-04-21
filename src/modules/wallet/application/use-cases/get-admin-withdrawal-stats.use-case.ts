import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Withdrawal, WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';

@Injectable()
export class GetAdminWithdrawalStatsUseCase {
    constructor(
        @InjectRepository(Withdrawal)
        private readonly withdrawalRepository: Repository<Withdrawal>,
    ) { }

    async execute() {
        const [pendingCount, processingCount, successCount, rejectedCount] = await Promise.all([
            this.withdrawalRepository.count({
                where: { status: WithdrawalStatus.PENDING }
            }),
            this.withdrawalRepository.count({
                where: { status: In([WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING]) }
            }),
            this.withdrawalRepository.count({
                where: { status: WithdrawalStatus.SUCCESS }
            }),
            this.withdrawalRepository.count({
                where: { status: In([WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED, WithdrawalStatus.CANCELLED, WithdrawalStatus.REVERSED]) }
            })
        ]);

        const pendingAmountResult = await this.withdrawalRepository
            .createQueryBuilder('w')
            .where('w.status IN (:...status)', { status: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] })
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        const successAmountResult = await this.withdrawalRepository
            .createQueryBuilder('w')
            .where('w.status IN (:...status)', { status: [WithdrawalStatus.SUCCESS, WithdrawalStatus.COMPLETED] })
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        return {
            totalPending: pendingCount,
            totalProcessing: processingCount,
            totalSuccess: successCount,
            totalRejected: rejectedCount,
            totalAmountPending: Number(pendingAmountResult?.sum || 0),
            totalAmountSuccess: Number(successAmountResult?.sum || 0),
        };
    }
}
