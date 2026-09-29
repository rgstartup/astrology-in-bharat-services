import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
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
import {
  PricingStatus,
  PricingTargetAudience,
} from '../../shared/enums/pricing.enum';
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
      })
      .from(expertAccounts)
      .where(eq(expertAccounts.id, Number(expert.sub)))
      .limit(1);

    if (!account) {
      return null;
    }

    const professionRows = await this.db
      .select({
        id: expertProfessions.id,
        profession_id: expertProfessions.profession_id,
        is_primary: expertProfessions.is_primary,
        title: professions.title,
        slug: professions.slug,
        icon: professions.icon,
      })
      .from(expertProfessions)
      .innerJoin(
        professions,
        eq(expertProfessions.profession_id, professions.id),
      )
      .where(eq(expertProfessions.expert_id, account.id));

    const specializationRows = await this.db
      .select({
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
          eq(expertSpecializations.expert_id, account.id),
          eq(specializations.is_active, true),
        ),
      );

    const [pricing] = await this.db
      .select({
        id: expertConsultationPricing.id,
        call_price: expertConsultationPricing.call_price,
        video_call_price: expertConsultationPricing.video_call_price,
        chat_price: expertConsultationPricing.chat_price,
      })
      .from(expertConsultationPricing)
      .where(
        and(
          eq(expertConsultationPricing.expert_id, account.id),
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
      .orderBy(desc(expertConsultationPricing.effective_from))
      .limit(1);

    return ExpertAccountResponseDto.from({
      ...account,
      professions: professionRows,
      specializations: specializationRows,
      pricing: pricing ? toExpertPricingResponse(pricing) : null,
    });
  }
}
