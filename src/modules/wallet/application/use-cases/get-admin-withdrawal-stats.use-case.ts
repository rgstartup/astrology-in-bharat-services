import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Withdrawal,
  WithdrawalStatus,
} from '../../infrastructure/entities/withdrawal.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class GetAdminWithdrawalStatsUseCase {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
  ) {}

  async execute(userRole?: RoleEnum) {
    const getBaseQuery = (statuses: WithdrawalStatus[]) => {
      const query = this.withdrawalRepository
        .createQueryBuilder('w')
        .where('w.status IN (:...statuses)', { statuses });

      if (userRole) {
        if (userRole === RoleEnum.EXPERT) {
          query.andWhere('w.expert_id IS NOT NULL');
        } else if (userRole === RoleEnum.MERCHANT) {
          query.andWhere('w.merchant_id IS NOT NULL');
        } else if (userRole === RoleEnum.AGENT) {
          query.andWhere('w.agent_profile_id IS NOT NULL');
        }
      }
      return query;
    };

    const [pendingCount, processingCount, successCount, rejectedCount] =
      await Promise.all([
        getBaseQuery([WithdrawalStatus.PENDING]).getCount(),
        getBaseQuery([
          WithdrawalStatus.APPROVED,
          WithdrawalStatus.PROCESSING,
        ]).getCount(),
        getBaseQuery([WithdrawalStatus.SUCCESS]).getCount(),
        getBaseQuery([
          WithdrawalStatus.REJECTED,
          WithdrawalStatus.FAILED,
          WithdrawalStatus.CANCELLED,
          WithdrawalStatus.REVERSED,
        ]).getCount(),
      ]);

    const pendingAmountResult = (await getBaseQuery([
      WithdrawalStatus.PENDING,
      WithdrawalStatus.PROCESSING,
    ])
      .select('SUM(w.amount)', 'sum')
      .getRawOne()) as { sum?: string | number };

    const successAmountResult = (await getBaseQuery([
      WithdrawalStatus.SUCCESS,
      WithdrawalStatus.COMPLETED,
    ])
      .select('SUM(w.amount)', 'sum')
      .getRawOne()) as { sum?: string | number };

    return {
      total_pending: pendingCount,
      total_processing: processingCount,
      total_success: successCount,
      total_rejected: rejectedCount,
      total_amount_pending: Number(pendingAmountResult?.sum || 0),
      total_amount_success: Number(successAmountResult?.sum || 0),
    };
  }
}
