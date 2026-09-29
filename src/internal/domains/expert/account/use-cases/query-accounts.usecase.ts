import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  or,
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
import { ExpertKycStatus } from '../../shared/enums/kyc-status.enum';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import {
  PricingStatus,
  PricingTargetAudience,
} from '../../shared/enums/pricing.enum';
import {
  toExpertAccountResponse,
  toExpertPricingResponse,
} from '../account.mapper';

@Injectable()
export class QueryExpertAccountsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list(query: QueryExpertDto) {
    const where = this.listWhere(query);

    const experts = await this.db
      .select({
        id: expertAccounts.id,
        about: expertAccounts.about,
        languages: expertAccounts.languages,
        name: expertAccounts.name,
        avatar: expertAccounts.avatar,
        experience_in_years: expertAccounts.experience_in_years,
        rating: expertAccounts.rating,
      })
      .from(expertAccounts)
      .where(where)
      .limit(query.limit)
      .offset(query.offset);

    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(expertAccounts)
      .where(where);

    const data = await this.withSpecializationsAndPricing(experts);
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
      })
      .from(expertAccounts)
      .where(eq(expertAccounts.kyc_status, ExpertKycStatus.APPROVED))
      .orderBy(desc(expertAccounts.rating))
      .limit(limit);

    return this.withSpecializationsAndPricing(experts);
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

    const professionRows = await this.db
      .select({
        id: expertProfessions.id,
        title: professions.title,
        slug: professions.slug,
      })
      .from(expertProfessions)
      .innerJoin(
        professions,
        eq(expertProfessions.profession_id, professions.id),
      )
      .where(eq(expertProfessions.expert_id, account.id));

    const [withRelations] = await this.withSpecializationsAndPricing([account]);
    return {
      ...withRelations,
      expert_professions: professionRows,
      professions: professionRows,
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

  private async withSpecializationsAndPricing<T extends { id: number }>(
    experts: T[],
  ) {
    if (experts.length === 0) return [];
    const ids = experts.map((e) => e.id);

    const specRows = await this.db
      .select({
        expert_id: expertSpecializations.expert_id,
        id: expertSpecializations.id,
        title: specializations.title,
        slug: specializations.slug,
      })
      .from(expertSpecializations)
      .innerJoin(
        specializations,
        eq(expertSpecializations.specialization_id, specializations.id),
      )
      .where(
        and(
          inArray(expertSpecializations.expert_id, ids),
          eq(specializations.is_active, true),
        ),
      );

    const pricingRows = await this.db
      .select({
        expert_id: expertConsultationPricing.expert_id,
        id: expertConsultationPricing.id,
        call_price: expertConsultationPricing.call_price,
        video_call_price: expertConsultationPricing.video_call_price,
        chat_price: expertConsultationPricing.chat_price,
        currency: expertConsultationPricing.currency,
        effective_from: expertConsultationPricing.effective_from,
      })
      .from(expertConsultationPricing)
      .where(
        and(
          inArray(expertConsultationPricing.expert_id, ids),
          eq(expertConsultationPricing.is_active, true),
          eq(expertConsultationPricing.status, PricingStatus.ACTIVE),
          eq(
            expertConsultationPricing.target_audience,
            PricingTargetAudience.ALL,
          ),
          lte(expertConsultationPricing.effective_from, sql`CURRENT_TIMESTAMP`),
          or(
            isNull(expertConsultationPricing.effective_to),
            gt(expertConsultationPricing.effective_to, sql`CURRENT_TIMESTAMP`),
          ),
        ),
      )
      .orderBy(desc(expertConsultationPricing.effective_from));

    const specsByExpert = new Map<number, typeof specRows>();
    for (const row of specRows) {
      const list = specsByExpert.get(row.expert_id) ?? [];
      list.push(row);
      specsByExpert.set(row.expert_id, list);
    }

    // Rows come back ordered by `effective_from` DESC, so the first row per
    // expert is the latest active pricing (mirrors `leftJoinAndMapOne` +
    // `addOrderBy('pricing.effective_from', 'DESC')`).
    const pricingByExpert = new Map<number, (typeof pricingRows)[number]>();
    for (const row of pricingRows) {
      if (!pricingByExpert.has(row.expert_id)) {
        pricingByExpert.set(row.expert_id, row);
      }
    }

    return experts.map((expert) => {
      const pricing = pricingByExpert.get(expert.id) ?? null;
      return {
        ...expert,
        specializations: specsByExpert.get(expert.id) ?? [],
        pricing: pricing ? toExpertPricingResponse(pricing) : null,
      };
    });
  }
}
