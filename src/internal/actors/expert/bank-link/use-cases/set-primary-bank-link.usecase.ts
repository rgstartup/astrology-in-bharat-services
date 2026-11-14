import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { expertPayoutPlatformAccounts } from "@/core/drizzledb/schema";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payout-onboarding/payout-onboarding.interface";
import type { PayoutOnboardingService } from "@/external/payout-onboarding/payout-onboarding.interface";
import { BankLinkNotFoundError } from "../errors/bank-link-not-found.error";

export interface SetPrimaryBankLinkInput {
  expertId: number;
  payoutPlatformAccountId?: number;
}

@Injectable()
export class SetPrimaryBankLinkUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
  ) {}

  async execute(input: SetPrimaryBankLinkInput): Promise<void> {
    const { expertId, payoutPlatformAccountId } = input;

    if (!payoutPlatformAccountId) {
      throw new BankLinkNotFoundError();
    }

    // Verify the expert owns this link row
    const [row] = await this.db
      .select({ id: expertPayoutPlatformAccounts.id })
      .from(expertPayoutPlatformAccounts)
      .where(
        and(
          eq(expertPayoutPlatformAccounts.expertId, expertId),
          eq(
            expertPayoutPlatformAccounts.payoutPlatformAccountId,
            payoutPlatformAccountId,
          ),
        ),
      )
      .limit(1);

    if (!row) {
      throw new BankLinkNotFoundError();
    }

    // Flip all of this expert's links to non-primary, then set the chosen one
    await this.db
      .update(expertPayoutPlatformAccounts)
      .set({ isPrimary: false })
      .where(eq(expertPayoutPlatformAccounts.expertId, expertId));

    await this.db
      .update(expertPayoutPlatformAccounts)
      .set({ isPrimary: true })
      .where(
        and(
          eq(expertPayoutPlatformAccounts.expertId, expertId),
          eq(
            expertPayoutPlatformAccounts.payoutPlatformAccountId,
            payoutPlatformAccountId,
          ),
        ),
      );
  }
}
