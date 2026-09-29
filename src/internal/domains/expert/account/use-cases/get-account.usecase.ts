import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
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
import { IExpert } from '@/shared/types/access-token.payload';
import { PricingStatus, PricingTargetAudience } from '@/core/enums';
import { ExpertAccountResponseDto } from '../dto/response/expert-account-response.dto';
import { toExpertPricingResponse } from '../account.mapper';

@Injectable()
export class GetExpertAccountUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert: IExpert): Promise<ExpertAccountResponseDto | null> {
    const [account] = await this.db
      .select({
        id: expertAccounts.id,
        about: expertAccounts.about,
        languages: expertAccounts.languages,
        name: expertAccounts.name,
        avatar: expertAccounts.avatar,
        experience_in_years: expertAccounts.experience_in_years,
        professions: sql<
          Array<{
            id: number;
            profession_id: number;
            is_primary: boolean;
            title: string;
            slug: string;
            icon: string | null;
          }>
        >`COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ${expertProfessions}.${sql.identifier(expertProfessions.id.name)},
                'profession_id', ${expertProfessions}.${sql.identifier(expertProfessions.profession_id.name)},
                'is_primary', ${expertProfessions}.${sql.identifier(expertProfessions.is_primary.name)},
                'title', ${professions}.${sql.identifier(professions.title.name)},
                'slug', ${professions}.${sql.identifier(professions.slug.name)},
                'icon', ${professions}.${sql.identifier(professions.icon.name)}
              )
            )
            FROM ${expertProfessions}
            INNER JOIN ${professions} ON ${expertProfessions}.${sql.identifier(expertProfessions.profession_id.name)} = ${professions}.${sql.identifier(professions.id.name)}
            WHERE ${expertProfessions}.${sql.identifier(expertProfessions.expert_id.name)} = ${expertAccounts}.${sql.identifier(expertAccounts.id.name)}
          ),
          '[]'::json
        )`,
        specializations: sql<
          Array<{
            id: number;
            title: string;
            slug: string;
          }>
        >`COALESCE(
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
        )`,
        pricing: sql<{
          id: number;
          call_price: string | null;
          video_call_price: string | null;
          chat_price: string | null;
        } | null>`(
          SELECT json_build_object(
            'id', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.id.name)},
            'call_price', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.call_price.name)},
            'video_call_price', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.video_call_price.name)},
            'chat_price', ${expertConsultationPricing}.${sql.identifier(expertConsultationPricing.chat_price.name)}
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
        )`,
      })
      .from(expertAccounts)
      .where(eq(expertAccounts.id, Number(expert.sub)))
      .limit(1);

    if (!account) {
      return null;
    }

    return ExpertAccountResponseDto.from({
      ...account,
      pricing: account.pricing
        ? toExpertPricingResponse(account.pricing)
        : null,
    });
  }
}
