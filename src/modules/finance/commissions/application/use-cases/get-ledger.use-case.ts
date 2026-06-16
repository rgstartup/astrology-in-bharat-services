import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntry } from '@/modules/finance/commissions/infrastructure/entities/ledger-entry.entity';
import {
  QueryLedgerDto,
  QueryLedgerSummaryDto,
} from '../../api/dto/query-ledger.dto';

export { QueryLedgerDto, QueryLedgerSummaryDto };

export interface LedgerSummary {
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
export class GetLedgerUseCase {
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
  ) {}

  async execute(filters: QueryLedgerDto = {}): Promise<{
    data: LedgerEntry[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const qb = this.ledgerRepo
      .createQueryBuilder('entry')
      .orderBy('entry.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    if (filters.reference_type) {
      qb.andWhere('entry.reference_type = :ref_type', {
        ref_type: filters.reference_type,
      });
    }
    if (filters.from_date) {
      qb.andWhere('entry.created_at >= :from', {
        from: new Date(filters.from_date),
      });
    }
    if (filters.to_date) {
      qb.andWhere('entry.created_at <= :to', { to: new Date(filters.to_date) });
    }
    if (filters.provider_profile_id) {
      qb.andWhere('entry.provider_profile_id = :provider', {
        provider: filters.provider_profile_id,
      });
    }
    if (filters.client_profile_id) {
      qb.andWhere('entry.client_profile_id = :client', {
        client: filters.client_profile_id,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, limit, offset } };
  }

  async summary(filters: QueryLedgerSummaryDto = {}): Promise<LedgerSummary> {
    const qb = this.ledgerRepo.createQueryBuilder('entry');

    if (filters.reference_type) {
      qb.andWhere('entry.reference_type = :ref_type', {
        ref_type: filters.reference_type,
      });
    }
    if (filters.from_date) {
      qb.andWhere('entry.created_at >= :from', {
        from: new Date(filters.from_date),
      });
    }
    if (filters.to_date) {
      qb.andWhere('entry.created_at <= :to', { to: new Date(filters.to_date) });
    }
    if (filters.provider_profile_id) {
      qb.andWhere('entry.provider_profile_id = :provider', {
        provider: filters.provider_profile_id,
      });
    }

    const raw = await qb
      .select('COUNT(*)', 'count')
      .addSelect('SUM(entry.gross_amount)', 'total_gross')
      .addSelect('SUM(entry.platform_fee)', 'total_platform_fee')
      .addSelect('SUM(entry.gst)', 'total_gst')
      .addSelect('SUM(entry.platform_net)', 'total_platform_net')
      .addSelect(
        'SUM(entry.seller_agent_commission)',
        'total_seller_agent_commission',
      )
      .addSelect(
        'SUM(entry.buyer_agent_commission)',
        'total_buyer_agent_commission',
      )
      .addSelect('SUM(entry.provider_net)', 'total_provider_net')
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
