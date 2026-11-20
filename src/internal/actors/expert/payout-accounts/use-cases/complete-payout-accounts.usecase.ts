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
  payoutProviderConfigs,
  payoutAccountTypeEnum,
} from '@/core/drizzledb/schema';
import type { NewPayoutAccountReferenceRow } from '@/core/drizzledb/schema';
import { PayoutProviderService } from '../payout-provider.service';
import { EncryptionService } from '@/shared/services/encryption.service';
import { PayoutOnboardingCompleteInput } from '@/external/payouts/onboarding/payout-onboarding.interface';
import {
  PayoutOnboardingNotFoundError,
  PayoutOnboardingAlreadyCompletedError,
  PayoutOnboardingNoProviderAccountError,
  ProviderOnboardingCompletionFailedError,
  InvalidPayoutAccountDetailsError,
} from '../errors';

export interface CompletePayoutOnboardingInput {
  expertId: number;
  onboardingId: number;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  code?: string;
  state?: string;
  account_type?: (typeof payoutAccountTypeEnum.enumValues)[number];
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
      .from(payoutProviderConfigs)
      .innerJoin(
        paymentProviders,
        eq(payoutProviderConfigs.provider_id, paymentProviders.id),
      )
      .where(eq(payoutProviderConfigs.id, onboarding.payout_provider_account_id))
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

    // Build type-specific details from provider completion response.
    const accountType: (typeof payoutAccountTypeEnum.enumValues)[number] =
      input.account_type ?? 'bank_account';

    const details: Record<string, unknown> = buildPayoutAccountDetails(
      accountType,
      linkedAccount,
    );
    validatePayoutAccountDetails(accountType, details);

    // Create the payout account (internal partner payout destination).
    const [accountRow] = await this.db
      .insert(payoutAccounts)
      .values({
        payout_provider_account_id: onboarding.payout_provider_account_id,
        status: 'active',
        verification_status: 'verified',
        account_type: accountType,
        display_name: input.accountHolderName ?? linkedAccount.accountHolderName ?? null,
        account_fingerprint: linkedAccount.accountFingerprint ?? null,
        details,
        onboarding_status: 'VALIDATED',
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
      await this.db
        .insert(payoutAccountReferences)
        .values(references)
        .onConflictDoNothing();
    }

    // Link the payout account to the expert. Set as primary if this is the
    // expert's first linked payout account.
    const existingLinks = await this.db
      .select({ id: expertPayoutAccountLinks.id })
      .from(expertPayoutAccountLinks)
      .where(eq(expertPayoutAccountLinks.expert_id, input.expertId));

    await this.db.insert(expertPayoutAccountLinks).values({
      expert_id: input.expertId,
      payout_account_id: accountRow.id,
      is_primary: existingLinks.length === 0,
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

/**
 * Builds the type-specific `details` JSONB payload from the provider's
 * completion response. Bank fields come from typed linkedAccount properties;
 * VPA/wallet/card fields come from the provider's raw payload.
 */
function buildPayoutAccountDetails(
  accountType: (typeof payoutAccountTypeEnum.enumValues)[number],
  linkedAccount: any,
): Record<string, unknown> {
  const raw = linkedAccount?.raw ?? {};
  switch (accountType) {
    case 'bank_account':
      return {
        account_number_masked: linkedAccount.accountNumberMasked ?? null,
        bank_name: linkedAccount.bankName ?? null,
        ifsc: linkedAccount.ifsc ?? null,
      };
    case 'vpa':
      return { vpa_id: raw.vpa_id ?? null };
    case 'wallet':
      return { wallet_handle: raw.wallet_handle ?? null };
    case 'card':
      return { last4: raw.last4 ?? null, brand: raw.brand ?? null };
    default:
      return {};
  }
}

/**
 * Rejects `details` payloads missing required keys for the given `account_type`.
 * Throws `InvalidPayoutAccountDetailsError` when validation fails.
 */
function validatePayoutAccountDetails(
  accountType: (typeof payoutAccountTypeEnum.enumValues)[number],
  details: Record<string, unknown>,
): void {
  const required: Record<string, string[]> = {
    bank_account: ['account_number_masked', 'bank_name', 'ifsc'],
    vpa: ['vpa_id'],
    wallet: ['wallet_handle'],
    card: ['last4', 'brand'],
    other: [],
  };
  const missing = (required[accountType] ?? []).filter(
    (key) => details[key] === undefined || details[key] === null,
  );
  if (missing.length > 0) {
    throw new InvalidPayoutAccountDetailsError(accountType, missing);
  }
}
