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

export interface RefreshBankLinkStatusOutput {
  id: number;
  onboardingStatus: string;
  accountStatus: string | null;
  isActive: boolean;
}

@Injectable()
export class RefreshBankLinkStatusUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
  ) {}

  async execute(expert: IExpert): Promise<RefreshBankLinkStatusOutput> {
    const expertId = Number(expert.sub);

    const [row] = await this.db
      .select({
        id: payoutPlatformAccounts.id,
        validationStatus: payoutPlatformAccounts.validationStatus,
      })
      .from(payoutPlatformAccounts)
      .innerJoin(
        expertPayoutPlatformAccounts,
        eq(
          expertPayoutPlatformAccounts.payoutPlatformAccountId,
          payoutPlatformAccounts.id,
        ),
      )
      .where(
        and(
          eq(expertPayoutPlatformAccounts.expertId, expertId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new BankLinkNotFoundError();
    }

    return {
      id: row.id,
      onboardingStatus: row.validationStatus,
      accountStatus: row.validationStatus,
      isActive: row.validationStatus === 'VALIDATED',
    };
  }
}
