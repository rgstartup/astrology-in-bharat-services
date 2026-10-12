import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { earningSplits } from '@/core/drizzledb/schema';
import { QueryEarningSplitsDto } from '../dto/query-earning-splits.dto';
import { type EarningSplitDomain, toEarningSplitDomain } from '../earnings.mapper';

export interface EarningsSummaryResult {
  totalGross: number;
  totalPlatformEarning: number;
  totalGst: number;
  totalProviderEarning: number;
  totalAgentEarning: number;
  count: number;
}

@Injectable()
export class GetEarningSplitsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(filters: QueryEarningSplitsDto = {}): Promise<{
    data: EarningSplitDomain[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const conditions = [];

    if (filters.event_type) {
      conditions.push(eq(earningSplits.reference_type, filters.event_type));
    }
    if (filters.provider_profile_id) {
      conditions.push(
        eq(earningSplits.provider_profile_id, filters.provider_profile_id),
      );
    }
    if (filters.client_profile_id) {
      conditions.push(
        eq(earningSplits.client_profile_id, filters.client_profile_id),
      );
    }
    if (filters.from_date) {
      conditions.push(
        gte(earningSplits.created_at, new Date(filters.from_date)),
      );
    }
    if (filters.to_date) {
      conditions.push(lte(earningSplits.created_at, new Date(filters.to_date)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [totalResult]] = await Promise.all([
      this.db
        .select()
        .from(earningSplits)
        .where(whereClause)
        .orderBy(desc(earningSplits.created_at))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(earningSplits)
        .where(whereClause),
    ]);

    return {
      data: rows.map(toEarningSplitDomain),
      meta: { total: totalResult?.total ?? 0, limit, offset },
    };
  }

  async summary(
    filters: QueryEarningSplitsDto = {},
  ): Promise<EarningsSummaryResult> {
    const conditions = [];

    if (filters.event_type) {
      conditions.push(eq(earningSplits.reference_type, filters.event_type));
    }
    if (filters.provider_profile_id) {
      conditions.push(
        eq(earningSplits.provider_profile_id, filters.provider_profile_id),
      );
    }
    if (filters.from_date) {
      conditions.push(
        gte(earningSplits.created_at, new Date(filters.from_date)),
      );
    }
    if (filters.to_date) {
      conditions.push(lte(earningSplits.created_at, new Date(filters.to_date)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [raw] = await this.db
      .select({
        count: count(),
        totalGross: sql<string>`coalesce(sum(${earningSplits.gross_amount}), 0)`,
        totalPlatformEarning: sql<string>`coalesce(sum(${earningSplits.platform_earning}), 0)`,
        totalGst: sql<string>`coalesce(sum(${earningSplits.gst_on_platform_fee}), 0)`,
        totalProviderEarning: sql<string>`coalesce(sum(${earningSplits.provider_earning}), 0)`,
        totalAgentEarning: sql<string>`coalesce(sum(${earningSplits.seller_agent_earning} + ${earningSplits.buyer_agent_earning}), 0)`,
      })
      .from(earningSplits)
      .where(whereClause);

    return {
      count: Number(raw?.count ?? 0),
      totalGross: Number(raw?.totalGross ?? 0),
      totalPlatformEarning: Number(raw?.totalPlatformEarning ?? 0),
      totalGst: Number(raw?.totalGst ?? 0),
      totalProviderEarning: Number(raw?.totalProviderEarning ?? 0),
      totalAgentEarning: Number(raw?.totalAgentEarning ?? 0),
    };
  }
}

