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
import { PresenceService } from '@/internal/presence/presence.service';

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
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presenceService: PresenceService,
  ) {}

  private get specializationsSubquery() {
    return sql<SpecializationSubqueryResult[]>`COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ${specializations}.${sql.identifier(specializations.id.name)},
            'title', ${specializations}.${sql.identifier(specializations.title.name)},
            'slug', ${specializations}.${sql.identifier(specializations.slug.name)}
          )
        )
        FROM ${expertSpecializations}
        INNER JOIN ${specializations} ON ${expertSpecializations}.${sql.identifier(expertSpecializations.specialization_id.name)} = ${specializations}.${sql.identifier(specializations.id.name)}
        WHERE ${expertSpecializations}.${sql.identifier(expertSpecializations.expert_id.name)} = ${expertAccounts}.${sql.identifier(expertAccounts.id.name)}
          AND ${specializations}.${sql.identifier(specializations.is_active.name)} = true
      ),
      '[]'::json
    )`;
  }

  private get pricingSubquery() {
    return sql<PricingSubqueryResult | null>`(
      SELECT json_build_object(
        'id', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.id.name)},
        'call_price', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.call_price.name)},
        'video_call_price', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.video_call_price.name)},
        'chat_price', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.chat_price.name)},
        'currency', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.currency.name)},
        'effective_from', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.effective_from.name)}
      )
      FROM ${expertConsultationPricing}
      WHERE ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.expert_id.name)} = ${expertAccounts}.${sql.identifier(expertAccounts.id.name)}
        AND ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.is_active.name)} = true
        AND ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.status.name)} = ${PricingStatus.ACTIVE}
        AND ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.target_audience.name)} = ${PricingTargetAudience.ALL}
        AND ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.effective_from.name)} <= CURRENT_TIMESTAMP
        AND (
          ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.effective_to.name)} IS NULL
          OR ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.effective_to.name)} > CURRENT_TIMESTAMP
        )
      ORDER BY ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.effective_from.name)} DESC
      LIMIT 1
    )`;
  }

  private get professionsSubquery() {
    return sql<ProfessionSubqueryResult[]>`COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', ${expertProfessions}.${sql.identifier(expertProfessions.id.name)},
            'title', ${professions}.${sql.identifier(professions.title.name)},
            'slug', ${professions}.${sql.identifier(professions.slug.name)}
          )
        )
        FROM ${expertProfessions}
        INNER JOIN ${professions} ON ${expertProfessions}.${sql.identifier(expertProfessions.profession_id.name)} = ${professions}.${sql.identifier(professions.id.name)}
        WHERE ${expertProfessions}.${sql.identifier(expertProfessions.expert_id.name)} = ${expertAccounts}.${sql.identifier(expertAccounts.id.name)}
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
      this.db.select({ value: count() }).from(expertAccounts).where(where),
    ]);

    const expertIds = experts.map((e) => e.id);
    const statuses = await this.presenceService.getStatuses(expertIds);

    const data = experts.map((expert) => {
      const status = statuses.get(expert.id) || 'offline';
      return {
        ...expert,
        status,
        isAvailableForConsultation: status === 'online',
        pricing: expert.pricing
          ? toExpertPricingResponse(expert.pricing)
          : null,
      };
    });

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

    const expertIds = experts.map((e) => e.id);
    const statuses = await this.presenceService.getStatuses(expertIds);

    return experts.map((expert) => {
      const status = statuses.get(expert.id) || 'offline';
      return {
        ...expert,
        status,
        isAvailableForConsultation: status === 'online',
        pricing: expert.pricing
          ? toExpertPricingResponse(expert.pricing)
          : null,
      };
    });
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
        availability_mode: expertAccounts.availability_mode,
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

    const status = await this.presenceService.getStatus(id);

    return {
      ...account,
      status,
      isAvailableForConsultation: status === 'online',
      expert_professions: account.professions,
      professions: account.professions,
      pricing: account.pricing
        ? toExpertPricingResponse(account.pricing)
        : null,
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
