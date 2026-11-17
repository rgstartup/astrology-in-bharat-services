import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  payoutPlatformAccounts,
  expertPayoutPlatformAccounts,
} from "@/core/drizzledb/schema";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import type { PayoutOnboardingService } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { IExpert } from "@/shared/types/access-token.payload";

export interface BankLinkSummary {
  id: number;
  paymentProvider: string;
  providerProduct: string;
  onboardingStatus: string;
  accountStatus: string | null;
  externalAccountId: string | null;
  isActive: boolean;
  isPrimary: boolean;
  activatedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ListBankLinksUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
  ) {}

  async execute(expert: IExpert): Promise<BankLinkSummary[]> {
    const expertId = Number(expert.sub);

    const rows = await this.db
      .select({
        id: payoutPlatformAccounts.id,
        paymentProvider: payoutPlatformAccounts.platform,
        providerProduct: payoutPlatformAccounts.accountType,
        onboardingStatus: payoutPlatformAccounts.validationStatus,
        accountStatus: payoutPlatformAccounts.validationStatus,
        externalAccountId: payoutPlatformAccounts.platformFundId,
        isPrimary: expertPayoutPlatformAccounts.isPrimary,
        activatedAt: payoutPlatformAccounts.updatedAt,
        createdAt: payoutPlatformAccounts.createdAt,
      })
      .from(payoutPlatformAccounts)
      .innerJoin(
        expertPayoutPlatformAccounts,
        eq(
          expertPayoutPlatformAccounts.payoutPlatformAccountId,
          payoutPlatformAccounts.id,
        ),
      )
      .where(eq(expertPayoutPlatformAccounts.expertId, expertId));

    return rows.map((row) => ({
      id: row.id,
      paymentProvider: row.paymentProvider,
      providerProduct: row.providerProduct,
      onboardingStatus: row.onboardingStatus,
      accountStatus: row.accountStatus,
      externalAccountId: row.externalAccountId,
      isActive: row.onboardingStatus === 'VALIDATED',
      isPrimary: row.isPrimary,
      activatedAt: row.activatedAt,
      createdAt: row.createdAt,
    }));
  }
}
