import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionSplit } from '@/modules/finance/commissions/infrastructure/entities/commission-split.entity';
import {
  QueryCommissionSplitsDto,
  QueryCommissionSplitsSummaryDto,
} from '../../api/dto/query-commission-splits.dto';

export { QueryCommissionSplitsDto, QueryCommissionSplitsSummaryDto };

export interface CommissionSplitsSummary {
  total_gross: number;
  total_platform_fee: number;
  total_gst: number;
  total_platform_net: number;
  total_seller_agent_commission: number;
  total_buyer_agent_commission: number;
  total_provider_net: number;
  count: number;
}

@Injectable()
export class GetCommissionSplitsUseCase {
  constructor(
    @InjectRepository(CommissionSplit)
    private readonly splitRepo: Repository<CommissionSplit>,
  ) {}

  async execute(filters: QueryCommissionSplitsDto = {}): Promise<{
    data: CommissionSplit[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const qb = this.splitRepo
      .createQueryBuilder('split')
      .orderBy('split.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.reference_type) {
      qb.andWhere('split.reference_type = :ref_type', {
        ref_type: filters.reference_type,
      });
    }
    if (filters.from_date) {
      qb.andWhere('split.created_at >= :from', {
        from: new Date(filters.from_date),
      });
    }
    if (filters.to_date) {
      qb.andWhere('split.created_at <= :to', { to: new Date(filters.to_date) });
    }
    if (filters.provider_profile_id) {
      qb.andWhere('split.provider_profile_id = :provider', {
        provider: filters.provider_profile_id,
      });
    }
    if (filters.client_profile_id) {
      qb.andWhere('split.client_profile_id = :client', {
        client: filters.client_profile_id,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, limit, offset } };
  }

  async summary(
    filters: QueryCommissionSplitsSummaryDto = {},
  ): Promise<CommissionSplitsSummary> {
    const qb = this.splitRepo.createQueryBuilder('split');

    if (filters.reference_type) {
      qb.andWhere('split.reference_type = :ref_type', {
        ref_type: filters.reference_type,
      });
    }
    if (filters.from_date) {
      qb.andWhere('split.created_at >= :from', {
        from: new Date(filters.from_date),
      });
    }
    if (filters.to_date) {
      qb.andWhere('split.created_at <= :to', { to: new Date(filters.to_date) });
    }
    if (filters.provider_profile_id) {
      qb.andWhere('split.provider_profile_id = :provider', {
        provider: filters.provider_profile_id,
      });
    }

    const raw = await qb
      .select('COUNT(*)', 'count')
      .addSelect('SUM(split.gross_amount)', 'total_gross')
      .addSelect('SUM(split.platform_fee)', 'total_platform_fee')
      .addSelect('SUM(split.gst)', 'total_gst')
      .addSelect('SUM(split.platform_net)', 'total_platform_net')
      .addSelect(
        'SUM(split.seller_agent_commission)',
        'total_seller_agent_commission',
      )
      .addSelect(
        'SUM(split.buyer_agent_commission)',
        'total_buyer_agent_commission',
      )
      .addSelect('SUM(split.provider_net)', 'total_provider_net')
      .getRawOne<Record<string, string>>();

    return {
      count: Number(raw?.count ?? 0),
      total_gross: Number(raw?.total_gross ?? 0),
      total_platform_fee: Number(raw?.total_platform_fee ?? 0),
      total_gst: Number(raw?.total_gst ?? 0),
      total_platform_net: Number(raw?.total_platform_net ?? 0),
      total_seller_agent_commission: Number(
        raw?.total_seller_agent_commission ?? 0,
      ),
      total_buyer_agent_commission: Number(
        raw?.total_buyer_agent_commission ?? 0,
      ),
      total_provider_net: Number(raw?.total_provider_net ?? 0),
    };
  }
}
