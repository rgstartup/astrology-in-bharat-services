import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EarningSplit } from '../entities/earning-split.entity';
import { QueryEarningSplitsDto } from '../dto/query-earning-splits.dto';

export interface EarningsSummaryResult {
  totalGross: number;
  totalPlatformEarning: number;
  totalGst: number;
  totalProviderEarning: number;
  totalAgentEarning: number;
  totalReferralEarning: number;
  count: number;
}

@Injectable()
export class GetEarningSplitsUseCase {
  constructor(
    @InjectRepository(EarningSplit)
    private readonly splitRepo: Repository<EarningSplit>,
  ) {}

  async execute(filters: QueryEarningSplitsDto = {}): Promise<{
    data: EarningSplit[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const qb = this.splitRepo
      .createQueryBuilder('s')
      .orderBy('s.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.event_type) {
      qb.andWhere('s.reference_type = :event_type', {
        event_type: filters.event_type,
      });
    }
    if (filters.provider_profile_id) {
      qb.andWhere('s.provider_profile_id = :provider', {
        provider: filters.provider_profile_id,
      });
    }
    if (filters.client_profile_id) {
      qb.andWhere('s.client_profile_id = :client', {
        client: filters.client_profile_id,
      });
    }
    if (filters.from_date) {
      qb.andWhere('s.created_at >= :from', { from: new Date(filters.from_date) });
    }
    if (filters.to_date) {
      qb.andWhere('s.created_at <= :to', { to: new Date(filters.to_date) });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, limit, offset } };
  }

  async summary(
    filters: QueryEarningSplitsDto = {},
  ): Promise<EarningsSummaryResult> {
    const qb = this.splitRepo.createQueryBuilder('s');

    if (filters.event_type) {
      qb.andWhere('s.reference_type = :event_type', {
        event_type: filters.event_type,
      });
    }
    if (filters.provider_profile_id) {
      qb.andWhere('s.provider_profile_id = :provider', {
        provider: filters.provider_profile_id,
      });
    }
    if (filters.from_date) {
      qb.andWhere('s.created_at >= :from', { from: new Date(filters.from_date) });
    }
    if (filters.to_date) {
      qb.andWhere('s.created_at <= :to', { to: new Date(filters.to_date) });
    }

    const raw = await qb
      .select('COUNT(*)', 'count')
      .addSelect('SUM(s.gross_amount)', 'totalGross')
      .addSelect('SUM(s.platform_earning)', 'totalPlatformEarning')
      .addSelect('SUM(s.gst_on_platform_fee)', 'totalGst')
      .addSelect('SUM(s.provider_earning)', 'totalProviderEarning')
      .addSelect(
        'SUM(s.seller_agent_earning + s.buyer_agent_earning)',
        'totalAgentEarning',
      )
      .addSelect('SUM(s.referral_earning)', 'totalReferralEarning')
      .getRawOne<Record<string, string>>();

    return {
      count: Number(raw?.count ?? 0),
      totalGross: Number(raw?.totalGross ?? 0),
      totalPlatformEarning: Number(raw?.totalPlatformEarning ?? 0),
      totalGst: Number(raw?.totalGst ?? 0),
      totalProviderEarning: Number(raw?.totalProviderEarning ?? 0),
      totalAgentEarning: Number(raw?.totalAgentEarning ?? 0),
      totalReferralEarning: Number(raw?.totalReferralEarning ?? 0),
    };
  }
}
