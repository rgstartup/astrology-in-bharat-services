import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../../../core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '../../../../../core/drizzledb/drizzle.types';
import { expertAccounts } from '../../../../../core/drizzledb/schema';
import { IExpert } from '../../../../../shared/types/access-token.payload';

@Injectable()
export class CompleteOnboardingUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** Idempotent: sets the timestamp once; skip and finish share it. */
  async execute(expert: IExpert): Promise<void> {
    await this.db
      .update(expertAccounts)
      .set({ onboarding_completed_at: new Date(), updated_at: new Date() })
      .where(
        and(
          eq(expertAccounts.id, Number(expert.sub)),
          isNull(expertAccounts.onboarding_completed_at),
        ),
      );
  }
}
