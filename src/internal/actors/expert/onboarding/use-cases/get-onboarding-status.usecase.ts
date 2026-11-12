import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import {
  expertAccounts,
  expertProfessions,
  expertSpecializations,
} from '../../../../../core/drizzledb/schema';
import { IExpert } from '../../../../../shared/types/access-token.payload';

export interface OnboardingStatus {
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  steps: {
    professions: boolean;
    specializations: boolean;
    profile_photo: boolean;
  };
  /** Placeholder until the Razorpay linked-account flow (Plan 2) ships. */
  bank_linked: boolean;
}

@Injectable()
export class GetOnboardingStatusUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(expert: IExpert): Promise<OnboardingStatus> {
    const expertId = Number(expert.sub);

    const [account] = await this.db
      .select({
        onboarding_completed_at: expertAccounts.onboarding_completed_at,
        avatar_id: expertAccounts.avatar_id,
        avatar: expertAccounts.avatar,
      })
      .from(expertAccounts)
      .where(eq(expertAccounts.id, expertId))
      .limit(1);

    const [[professionRow], [specializationRow]] = await Promise.all([
      this.db
        .select({ one: sql<number>`1` })
        .from(expertProfessions)
        .where(eq(expertProfessions.expert_id, expertId))
        .limit(1),
      this.db
        .select({ one: sql<number>`1` })
        .from(expertSpecializations)
        .where(eq(expertSpecializations.expert_id, expertId))
        .limit(1),
    ]);

    return {
      onboarding_completed: Boolean(account?.onboarding_completed_at),
      onboarding_completed_at: account?.onboarding_completed_at
        ? account.onboarding_completed_at.toISOString()
        : null,
      steps: {
        professions: Boolean(professionRow),
        specializations: Boolean(specializationRow),
        profile_photo: Boolean(account?.avatar_id ?? account?.avatar),
      },
      bank_linked: false,
    };
  }
}
