/**
 * Complete a payout onboarding attempt.
 *
 * Calls provider.complete() with the bank details / auth code, then persists
 * the resulting provider account reference as a payout_accounts row with
 * linked payout_account_references (contact/fund_account/etc.) and links it
 * to the expert via expert_payout_accounts. Updates payout_onboardings to
 * completed / failed.
 */
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { eq, and } from 'drizzle-orm';
import {
  payoutOnboardings,
  payoutAccounts,
  payoutAccountReferences,
  expertPayoutAccountLinks,
  paymentProviders,
  payoutProviderAccounts,
} from '@/core/drizzledb/schema';
import type { NewPayoutAccountReferenceRow } from '@/core/drizzledb/schema';
import { PayoutProviderService } from '../payout-provider.service';
import { EncryptionService } from '@/shared/services/encryption.service';
import { PayoutOnboardingCompleteInput } from '@/external/payout-onboarding/payout-onboarding.interface';
import {
  PayoutOnboardingNotFoundError,
  PayoutOnboardingAlreadyCompletedError,
  PayoutOnboardingNoProviderAccountError,
  ProviderOnboardingCompletionFailedError,
} from '../errors';

export interface CompletePayoutOnboardingInput {
  expertId: number;
  onboardingId: number;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  code?: string;
  state?: string;
}

export interface CompletePayoutOnboardingOutput {
  accountId: number;
  status: string;
  providerReference: string;
}

@Injectable()
export class CompletePayoutOnboardingUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly providerService: PayoutProviderService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(input: CompletePayoutOnboardingInput): Promise<CompletePayoutOnboardingOutput> {
    const [onboarding] = await this.db
      .select({
        id: payoutOnboardings.id,
        payout_provider_account_id: payoutOnboardings.payout_provider_account_id,
        status: payoutOnboardings.status,
      })
      .from(payoutOnboardings)
      .where(eq(payoutOnboardings.id, input.onboardingId))
      .limit(1);

    if (!onboarding) {
      throw new PayoutOnboardingNotFoundError(input.onboardingId);
    }

    if (onboarding.status === 'completed') {
      throw new PayoutOnboardingAlreadyCompletedError();
    }

    if (!onboarding.payout_provider_account_id) {
      throw new PayoutOnboardingNoProviderAccountError();
    }

    // Resolve provider for this onboarding attempt (use provider account's provider code).
    const [providerAccount] = await this.db
      .select({ code: paymentProviders.code })
      .from(payoutProviderAccounts)
      .innerJoin(
        paymentProviders,
        eq(payoutProviderAccounts.provider_id, paymentProviders.id),
      )
      .where(eq(payoutProviderAccounts.id, onboarding.payout_provider_account_id))
      .limit(1);

    const provider = this.providerService.resolve(providerAccount.code);

    // Call provider.complete() with bank details or auth code.
    let linkedAccount: any;
    try {
      linkedAccount = await provider.complete({
        accountHolderName: input.accountHolderName,
        accountNumber: input.accountNumber,
        ifsc: input.ifsc,
        code: input.code,
        state: input.state,
      });
    } catch (error: unknown) {
      await this.db
        .update(payoutOnboardings)
        .set({
          status: 'failed',
          failure_code: 'provider_complete_failed',
          failure_message: error instanceof Error ? error.message : String(error),
        })
        .where(eq(payoutOnboardings.id, input.onboardingId));
      throw new ProviderOnboardingCompletionFailedError(
        providerAccount.code,
        error instanceof Error ? error.message : String(error),
      );
    }

    // Create the payout account (internal partner payout destination).
    const [accountRow] = await this.db
      .insert(payoutAccounts)
      .values({
        payout_provider_account_id: onboarding.payout_provider_account_id,
        status: 'active',
        verification_status: 'verified',
        account_type: 'bank_account',
        display_name: input.accountHolderName ?? linkedAccount.accountHolderName ?? null,
        account_fingerprint: linkedAccount.accountFingerprint ?? null,
        is_primary: false,
        provider_metadata: linkedAccount.raw ?? null,
        verified_at: new Date(),
      })
      .returning();

    // Persist provider references (contact id, fund account id, etc.)
    const references: NewPayoutAccountReferenceRow[] = [];

    if (linkedAccount.contactId) {
      references.push({
        payout_account_id: accountRow.id,
        payout_provider_account_id: accountRow.payout_provider_account_id,
        reference_type: 'contact',
        provider_reference: linkedAccount.contactId,
        provider_metadata: null,
      });
    }
    if (linkedAccount.fundAccountId) {
      references.push({
        payout_account_id: accountRow.id,
        payout_provider_account_id: accountRow.payout_provider_account_id,
        reference_type: 'fund_account',
        provider_reference: linkedAccount.fundAccountId,
        provider_metadata: null,
      });
    }
    if (linkedAccount.externalAccountId) {
      references.push({
        payout_account_id: accountRow.id,
        payout_provider_account_id: accountRow.payout_provider_account_id,
        reference_type: 'external_account',
        provider_reference: linkedAccount.externalAccountId,
        provider_metadata: null,
      });
    }

    if (references.length > 0) {
      await this.db.insert(payoutAccountReferences).values(references);
    }

    // Link the payout account to the expert.
    await this.db.insert(expertPayoutAccountLinks).values({
      expert_id: input.expertId,
      payout_account_id: accountRow.id,
      is_primary: false,
    });

    // Mark onboarding completed.
    await this.db
      .update(payoutOnboardings)
      .set({
        status: 'completed',
        action_required: 'none',
        provider_reference: linkedAccount.externalAccountId ?? linkedAccount.fundAccountId ?? null,
        completed_at: new Date(),
      })
      .where(eq(payoutOnboardings.id, input.onboardingId));

    return {
      accountId: accountRow.id,
      status: 'active',
      providerReference: linkedAccount.externalAccountId ?? linkedAccount.fundAccountId ?? '',
    };
  }
}
