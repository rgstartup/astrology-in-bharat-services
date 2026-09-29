import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  expertAccounts,
  expertConsultationPricing,
  expertProfessions,
  expertSpecializations,
  professions,
  specializations,
} from '@/core/drizzledb/schema';
import { QueryExpertDto } from '../dto/request/query-expert.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import {
  ExpertKycStatus,
  PricingStatus,
  PricingTargetAudience,
} from '@/core/enums';
import {
  toExpertAccountResponse,
  toExpertPricingResponse,
} from '../account.mapper';

type PricingSubqueryResult = {
  id: number;
  call_price: string | null;
  video_call_price: string | null;
  chat_price: string | null;
  currency: string;
  effective_from: string;
};

type SpecializationSubqueryResult = {
  id: number;
  title: string;
  slug: string;
};

type ProfessionSubqueryResult = {
  id: number;
  title: string;
  slug: string;
};

@Injectable()
export class QueryExpertAccountsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  private get specializationsSubquery() {
    return sql<SpecializationSubqueryResult[]>`COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ${expertSpecializations.id},
            'title', ${specializations.title},
            'slug', ${specializations.slug}
          )
        )
        FROM ${expertSpecializations}
        INNER JOIN ${specializations} ON ${expertSpecializations.specialization_id} = ${specializations.id}
        WHERE ${expertSpecializations.expert_id} = ${expertAccounts.id}
          AND ${specializations.is_active} = true
      ),
      '[]'::json
    )`;
  }

  private get pricingSubquery() {
    return sql<PricingSubqueryResult | null>`(
      SELECT json_build_object(
        'id', ${expertConsultationPricing.id},
        'call_price', ${expertConsultationPricing.call_price},
        'video_call_price', ${expertConsultationPricing.video_call_price},
        'chat_price', ${expertConsultationPricing.chat_price},
        'currency', ${expertConsultationPricing.currency},
        'effective_from', ${expertConsultationPricing.effective_from}
      )
      FROM ${expertConsultationPricing}
      WHERE ${expertConsultationPricing.expert_id} = ${expertAccounts.id}
        AND ${expertConsultationPricing.is_active} = true
        AND ${expertConsultationPricing.status} = ${PricingStatus.ACTIVE}
        AND ${expertConsultationPricing.target_audience} = ${PricingTargetAudience.ALL}
        AND ${expertConsultationPricing.effective_from} <= CURRENT_TIMESTAMP
        AND (
          ${expertConsultationPricing.effective_to} IS NULL
          OR ${expertConsultationPricing.effective_to} > CURRENT_TIMESTAMP
        )
      ORDER BY ${expertConsultationPricing.effective_from} DESC
      LIMIT 1
    )`;
  }

  private get professionsSubquery() {
    return sql<ProfessionSubqueryResult[]>`COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ${expertProfessions.id},
            'title', ${professions.title},
            'slug', ${professions.slug}
          )
        )
        FROM ${expertProfessions}
        INNER JOIN ${professions} ON ${expertProfessions.profession_id} = ${professions.id}
        WHERE ${expertProfessions.expert_id} = ${expertAccounts.id}
      ),
      '[]'::json
    )`;
  }

  async list(query: QueryExpertDto) {
    const where = this.listWhere(query);

    const [experts, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: expertAccounts.id,
          about: expertAccounts.about,
          languages: expertAccounts.languages,
          name: expertAccounts.name,
          avatar: expertAccounts.avatar,
          experience_in_years: expertAccounts.experience_in_years,
          rating: expertAccounts.rating,
          specializations: this.specializationsSubquery,
          pricing: this.pricingSubquery,
        })
        .from(expertAccounts)
        .where(where)
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(expertAccounts)
        .where(where),
    ]);

    const data = experts.map((expert) => ({
      ...expert,
      pricing: expert.pricing ? toExpertPricingResponse(expert.pricing) : null,
    }));

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async topRated(limit = 3) {
    const experts = await this.db
      .select({
        id: expertAccounts.id,
        about: expertAccounts.about,
        languages: expertAccounts.languages,
        name: expertAccounts.name,
        avatar: expertAccounts.avatar,
        experience_in_years: expertAccounts.experience_in_years,
        rating: expertAccounts.rating,
        specializations: this.specializationsSubquery,
        pricing: this.pricingSubquery,
      })
      .from(expertAccounts)
      .where(eq(expertAccounts.kyc_status, ExpertKycStatus.APPROVED))
      .orderBy(desc(expertAccounts.rating))
      .limit(limit);

    return experts.map((expert) => ({
      ...expert,
      pricing: expert.pricing ? toExpertPricingResponse(expert.pricing) : null,
    }));
  }

  async byId(id: number) {
    const [account] = await this.db
      .select({
        id: expertAccounts.id,
        about: expertAccounts.about,
        languages: expertAccounts.languages,
        name: expertAccounts.name,
        avatar: expertAccounts.avatar,
        experience_in_years: expertAccounts.experience_in_years,
        rating: expertAccounts.rating,
        total_reviews: expertAccounts.total_reviews,
        total_likes: expertAccounts.total_likes,
        is_available: expertAccounts.is_available,
        professions: this.professionsSubquery,
        specializations: this.specializationsSubquery,
        pricing: this.pricingSubquery,
      })
      .from(expertAccounts)
      .where(
        and(
          eq(expertAccounts.kyc_status, ExpertKycStatus.APPROVED),
          eq(expertAccounts.id, Number(id)),
        ),
      )
      .limit(1);

    if (!account) throw new NotFoundException('Expert account not found');

    return {
      ...account,
      expert_professions: account.professions,
      professions: account.professions,
      pricing: account.pricing ? toExpertPricingResponse(account.pricing) : null,
    };
  }

  async byUserId(accountId: number) {
    const [account] = await this.db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.id, Number(accountId)))
      .limit(1);
    if (!account) return null;
    return toExpertAccountResponse(account);
  }

  private listWhere(query: QueryExpertDto): SQL {
    const conditions: SQL[] = [
      eq(expertAccounts.kyc_status, ExpertKycStatus.APPROVED),
    ];

    if (query?.q) {
      conditions.push(ilike(expertAccounts.name, `%${query.q}%`));
    }

    if (query?.specializations && query.specializations.length > 0) {
      conditions.push(
        exists(
          this.db
            .select({ one: sql`1` })
            .from(expertSpecializations)
            .innerJoin(
              specializations,
              eq(expertSpecializations.specialization_id, specializations.id),
            )
            .where(
              and(
                eq(expertSpecializations.expert_id, expertAccounts.id),
                eq(specializations.is_active, true),
                inArray(specializations.id, query.specializations.map(Number)),
              ),
            ),
        ),
      );
    }

    if (query.minExperience !== undefined) {
      conditions.push(
        gte(expertAccounts.experience_in_years, Number(query.minExperience)),
      );
    }

    if (query.online === 'true' || query.onlineOnly === 'true') {
      conditions.push(eq(expertAccounts.is_available, true));
    }

    return and(...conditions)!;
  }
}
