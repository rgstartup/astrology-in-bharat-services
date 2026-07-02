import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/entities/call-session.entity';

export enum CallSessionFilter {
  PENDING = 'pending',
  COMPLETED = 'completed',
  RECENT_PENDING = 'recent_pending',
  RECENT_COMPLETED = 'recent_completed',
  ALL = 'all',
}

@Injectable()
export class GetExpertCallSessionsUseCase {
  constructor(
    @InjectRepository(CallSession)
    private sessionRepo: Repository<CallSession>,
  ) {}

  async execute(
    expertProfileId: string,
    filter: CallSessionFilter,
    options: { limit?: number; offset?: number; search?: string } = {},
  ) {
    const queryBuilder = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.client', 'client')
      .leftJoinAndSelect('client.user', 'clientUser')
      .where('session.expert_id = :expert_id', { expert_id: expertProfileId });

    switch (filter) {
      case CallSessionFilter.PENDING:
        queryBuilder.andWhere('session.status IN (:...statuses)', {
          statuses: [CallSessionStatus.PENDING, CallSessionStatus.ACTIVE],
        });
        break;
      case CallSessionFilter.COMPLETED:
        queryBuilder.andWhere('session.status IN (:...statuses)', {
          statuses: [
            CallSessionStatus.COMPLETED,
            CallSessionStatus.CANCELLED,
            CallSessionStatus.REJECTED,
          ],
        });
        break;
      case CallSessionFilter.RECENT_PENDING:
        queryBuilder.andWhere('session.status IN (:...statuses)', {
          statuses: [CallSessionStatus.PENDING, CallSessionStatus.ACTIVE],
        });
        queryBuilder.limit(20);
        break;
      case CallSessionFilter.RECENT_COMPLETED:
        queryBuilder.andWhere('session.status IN (:...statuses)', {
          statuses: [
            CallSessionStatus.COMPLETED,
            CallSessionStatus.CANCELLED,
            CallSessionStatus.REJECTED,
          ],
        });
        queryBuilder.limit(20);
        break;
      case CallSessionFilter.ALL:
      default:
        break;
    }

    if (options.search) {
      queryBuilder.andWhere('clientUser.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    queryBuilder.orderBy('session.created_at', 'DESC');

    const totalCount = await queryBuilder.getCount();

    if (options.limit !== undefined) {
      queryBuilder.limit(options.limit);
    }
    if (options.offset !== undefined) {
      queryBuilder.offset(options.offset);
    }

    const data = await queryBuilder.getMany();
    return { data, meta: { total_count: totalCount } };
  }

  async getRevenueAndCount(expertProfileId: number) {
    const stats = (await this.sessionRepo
      .createQueryBuilder('call')
      .select('SUM(call.final_price)', 'total')
      .addSelect('COUNT(call.id)', 'count')
      .where('call.expert_id = :id AND call.status = :status', {
        id: expertProfileId,
        status: 'completed',
      })
      .getRawOne<{ total: string | null; count: string | null }>()) ?? {
      total: null,
      count: null,
    };
    return {
      total: parseFloat(stats.total ?? '0') || 0,
      count: parseInt(stats.count ?? '0', 10) || 0,
    };
  }
}
