import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  payoutPlatformAccounts,
  expertPayoutPlatformAccounts,
} from "@/core/drizzledb/schema";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payout-onboarding/payout-onboarding.interface";
import type { PayoutOnboardingService } from "@/external/payout-onboarding/payout-onboarding.interface";
import { IExpert } from "@/shared/types/access-token.payload";
import { BankLinkNotFoundError } from '../errors/bank-link-not-found.error';
import { BankLinkStateInvalidError } from '../errors/bank-link-state-invalid.error';

export interface ValidatePennyDropInput {
  expert: IExpert;
  validationId: string;
  amount: number;
}

export interface ValidatePennyDropOutput {
  validated: boolean;
}

@Injectable()
export class ValidatePennyDropUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
  ) {}

  async execute(input: ValidatePennyDropInput): Promise<ValidatePennyDropOutput> {
    const expertId = Number(input.expert.sub);

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
          eq(payoutPlatformAccounts.validationStatus, 'PENDING'),
        ),
      )
      .limit(1);

    if (!row) {
      throw new BankLinkNotFoundError();
    }

    if (!this.onboarder.validatePennyDrop) {
      throw new BankLinkStateInvalidError();
    }

    const { validated } = await this.onboarder.validatePennyDrop(
      input.validationId,
      input.amount,
    );

    if (!validated) {
      throw new BankLinkStateInvalidError();
    }

    await this.db
      .update(payoutPlatformAccounts)
      .set({
        validationStatus: 'VALIDATED',
        updatedAt: new Date(),
      })
      .where(eq(payoutPlatformAccounts.id, row.id));

    return { validated: true };
  }
}
