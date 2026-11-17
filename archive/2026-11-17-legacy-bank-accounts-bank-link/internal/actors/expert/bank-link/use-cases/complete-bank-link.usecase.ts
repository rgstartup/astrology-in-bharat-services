import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  payoutPlatformAccounts,
  expertPayoutPlatformAccounts,
} from "@/core/drizzledb/schema";
import { PAYOUT_ONBOARDING_SERVICE } from "@/external/payouts/onboarding/payout-onboarding.interface";
import type { PayoutOnboardingService } from "@/external/payouts/onboarding/payout-onboarding.interface";
import { EncryptionService } from "@/shared/services/encryption.service";
import { IExpert } from "@/shared/types/access-token.payload";
import { BankLinkStateInvalidError } from '../errors/bank-link-state-invalid.error';
import { PaymentProviderTokenExchangeFailedError } from '../errors/payment-provider-token-exchange-failed.error';

export interface CompleteBankLinkInput {
  expert: IExpert;
  /** Bank details (RazorpayX direct API) */
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
}

export interface CompleteBankLinkOutput {
  externalAccountId: string;
  status: string;
}

@Injectable()
export class CompleteBankLinkUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(PAYOUT_ONBOARDING_SERVICE)
    private readonly onboarder: PayoutOnboardingService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(input: CompleteBankLinkInput): Promise<CompleteBankLinkOutput> {
    // Direct API flow: create contact + fund account via service
    if (!input.accountHolderName || !input.accountNumber || !input.ifsc) {
      throw new BadRequestException(
        'accountHolderName, accountNumber and ifsc are required',
      );
    }

    let linkedAccount: any;
    try {
      linkedAccount = await this.onboarder.complete({
        accountHolderName: input.accountHolderName,
        accountNumber: input.accountNumber,
        ifsc: input.ifsc,
      });
    } catch (error: unknown) {
      throw new PaymentProviderTokenExchangeFailedError();
    }

    // Store PENDING platform account row (validation confirmed via penny-drop)
    const [platformRow] = await this.db
      .insert(payoutPlatformAccounts)
      .values({
        platform: this.onboarder.provider,
        platformFundId: linkedAccount.externalAccountId,
        accountType: 'bank_account',
        bankName: '',
        accountNumberMasked: input.accountNumber.slice(-4),
        ifsc: input.ifsc,
        validationStatus: 'PENDING',
        metadata: linkedAccount.raw,
      })
      .returning();

    // Link the platform account to the expert so onboarding status tracks it
    const expertId = Number(input.expert.sub);
    await this.db.insert(expertPayoutPlatformAccounts).values({
      expertId,
      payoutPlatformAccountId: platformRow.id,
      isPrimary: false,
    });

    return {
      externalAccountId: linkedAccount.externalAccountId,
      status: 'PENDING',
    };
  }
}
