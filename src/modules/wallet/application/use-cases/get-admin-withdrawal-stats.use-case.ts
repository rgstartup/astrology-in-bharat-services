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
        const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
            this.withdrawalRepository.count({
                where: { status: In([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]) }
            }),
            this.withdrawalRepository.count({
                where: { status: WithdrawalStatus.COMPLETED }
            }),
            this.withdrawalRepository.count({
                where: { status: WithdrawalStatus.REJECTED }
            })
        ]);

        const pendingAmountResult = await this.withdrawalRepository
            .createQueryBuilder('w')
            .where('w.status IN (:...status)', { status: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] })
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        const approvedAmountResult = await this.withdrawalRepository
            .createQueryBuilder('w')
            .where('w.status = :status', { status: WithdrawalStatus.COMPLETED })
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        return {
            totalPending: pendingCount,
            totalApproved: approvedCount,
            totalRejected: rejectedCount,
            totalAmountPending: Number(pendingAmountResult?.sum || 0),
            totalAmountApproved: Number(approvedAmountResult?.sum || 0),
        };
    }
}
