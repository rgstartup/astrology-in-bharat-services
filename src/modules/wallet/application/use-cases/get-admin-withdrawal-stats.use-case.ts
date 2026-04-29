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

    async execute(userRole?: string) {
        const getBaseQuery = (statuses: WithdrawalStatus[]) => {
            const query = this.withdrawalRepository.createQueryBuilder('w')
                .where('w.status IN (:...statuses)', { statuses });
            
            if (userRole && userRole !== 'all') {
                query.innerJoin('w.user', 'user')
                    .innerJoin('user.roles', 'role')
                    .andWhere('LOWER(role.name) = LOWER(:roleName)', { roleName: userRole });
            }
            return query;
        };


        const [pendingCount, processingCount, successCount, rejectedCount] = await Promise.all([
            getBaseQuery([WithdrawalStatus.PENDING]).getCount(),
            getBaseQuery([WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING]).getCount(),
            getBaseQuery([WithdrawalStatus.SUCCESS]).getCount(),
            getBaseQuery([WithdrawalStatus.REJECTED, WithdrawalStatus.FAILED, WithdrawalStatus.CANCELLED, WithdrawalStatus.REVERSED]).getCount(),
        ]);

        const pendingAmountResult = await getBaseQuery([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING])
            .select('SUM(w.amount)', 'sum')
            .getRawOne();

        const successAmountResult = await getBaseQuery([WithdrawalStatus.SUCCESS, WithdrawalStatus.COMPLETED])
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
