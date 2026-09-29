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
                'id', ${expertProfessions.id},
                'profession_id', ${expertProfessions.profession_id},
                'is_primary', ${expertProfessions.is_primary},
                'title', ${professions.title},
                'slug', ${professions.slug},
                'icon', ${professions.icon}
              )
            )
            FROM ${expertProfessions}
            INNER JOIN ${professions} ON ${expertProfessions.profession_id} = ${professions.id}
            WHERE ${expertProfessions.expert_id} = ${expertAccounts.id}
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
        )`,
        pricing: sql<{
          id: number;
          call_price: string | null;
          video_call_price: string | null;
          chat_price: string | null;
        } | null>`(
          SELECT json_build_object(
            'id', ${expertConsultationPricing.id},
            'call_price', ${expertConsultationPricing.call_price},
            'video_call_price', ${expertConsultationPricing.video_call_price},
            'chat_price', ${expertConsultationPricing.chat_price}
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
