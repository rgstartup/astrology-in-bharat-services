import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRule } from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';
import { QueryCommissionRulesDto } from '../../api/dto/query-commission-rules.dto';

export { QueryCommissionRulesDto };

@Injectable()
export class ListCommissionRulesUseCase {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepo: Repository<CommissionRule>,
  ) {}

  async execute(
    filters: QueryCommissionRulesDto = {},
  ): Promise<CommissionRule[]> {
    const qb = this.ruleRepo
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.tiers', 'tier')
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.created_at', 'DESC');

    if (filters?.event_type) {
      qb.andWhere('rule.event_type = :event_type', {
        event_type: filters.event_type,
      });
    }
    if (filters?.commission_type) {
      qb.andWhere('rule.commission_type = :commission_type', {
        commission_type: filters.commission_type,
      });
    }
    if (filters?.is_active !== undefined) {
      qb.andWhere('rule.is_active = :is_active', {
        is_active: filters.is_active,
      });
    }

    return qb.getMany();
  }
}
