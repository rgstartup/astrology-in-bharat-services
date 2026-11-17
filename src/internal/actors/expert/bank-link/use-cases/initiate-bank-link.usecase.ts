import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  payoutPlatformAccounts,
  expertPayoutPlatformAccounts,
} from "@/core/drizzledb/schema";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import type { PayoutOnboardingService, PayoutOnboardingExpertContext, PayoutOnboardingInitiateOutput } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { IExpert } from "@/shared/types/access-token.payload";
import { BankLinkAlreadyActiveError } from '../errors/bank-link-already-active.error';

export interface InitiateBankLinkInput {
  expert: IExpert;
  redirectUri?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
}

export interface InitiateBankLinkOutput {
  type: 'redirect' | 'form';
  url: string;
  state?: string;
  fields?: string[];
}

@Injectable()
export class InitiateBankLinkUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
  ) {}

  async execute(input: InitiateBankLinkInput): Promise<InitiateBankLinkOutput> {
    const expertId = Number(input.expert.sub);

    // Reject if expert already has an active/validated link
    const [existing] = await this.db
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

    if (existing) {
      const status = existing.validationStatus;
      if (status === 'VALIDATED' || status === 'INITIATED') {
        throw new BankLinkAlreadyActiveError();
      }
    }

    // Build the result via the service (RazorpayX returns form spec)
    const ctx: PayoutOnboardingExpertContext = {
      expertId,
      redirectUri: input.redirectUri ?? '',
      state: randomBytes(32).toString('hex'),
    };
    const result = await this.onboarder.initiate(ctx);

    if (result.type === 'form') {
      // Direct API flow (RazorpayX): no hosted URL, no DB row yet.
      // The expert fills the form and submits via complete().
      return { type: 'form', url: '', fields: result.fields };
    }

    // Redirect flow — not used by RazorpayX, but kept for completeness
    return {
      type: 'redirect',
      url: result.url,
      state: result.state,
    };
  }
}
