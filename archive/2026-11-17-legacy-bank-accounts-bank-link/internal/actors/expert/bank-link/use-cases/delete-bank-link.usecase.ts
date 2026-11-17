import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  payoutPlatformAccounts,
  expertPayoutPlatformAccounts,
} from "@/core/drizzledb/schema";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import type { PayoutOnboardingService } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { IExpert } from "@/shared/types/access-token.payload";
import { BankLinkNotFoundError } from '../errors/bank-link-not-found.error';

export interface DeleteBankLinkInput {
  expert: IExpert;
  payoutPlatformAccountId?: number;
}

@Injectable()
export class DeleteBankLinkUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
  ) {}

  async execute(input: DeleteBankLinkInput): Promise<void> {
    const expertId = Number(input.expert.sub);

    const [row] = await this.db
      .select({
        id: payoutPlatformAccounts.id,
        platformAccountId: expertPayoutPlatformAccounts.payoutPlatformAccountId,
        externalAccountId: payoutPlatformAccounts.platformFundId,
      })
      .from(payoutPlatformAccounts)
      .innerJoin(
        expertPayoutPlatformAccounts,
        eq(
          expertPayoutPlatformAccounts.payoutPlatformAccountId,
          payoutPlatformAccounts.id,
        ),
      )
      .where(eq(expertPayoutPlatformAccounts.expertId, expertId))
      .limit(1);

    if (!row) {
      throw new BankLinkNotFoundError();
    }

    // Best-effort deactivation on the provider side
    if (row.externalAccountId && this.onboarder.deactivate) {
      try {
        await this.onboarder.deactivate(row.externalAccountId);
      } catch {
        // Ignore deactivation errors — local unlink still proceeds
      }
    }

    await this.db
      .update(payoutPlatformAccounts)
      .set({
        validationStatus: 'FAILED',
        failureReason: 'expert_unlinked',
        updatedAt: new Date(),
      })
      .where(eq(payoutPlatformAccounts.id, row.id));

    await this.db
      .delete(expertPayoutPlatformAccounts)
      .where(
        and(
          eq(expertPayoutPlatformAccounts.expertId, expertId),
          eq(
            expertPayoutPlatformAccounts.payoutPlatformAccountId,
            row.platformAccountId,
          ),
        ),
      );
  }
}
