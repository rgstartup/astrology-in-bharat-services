/**
 * Unified payout provider contract.
 *
 * Combines onboarding (link a partner payout account) with payout execution
 * (create, query, cancel payouts). Providers implement this interface;
 * use-cases depend on it via the PAYOUT_PROVIDER DI token.
 *
 * Extends the onboarding portion of `PayoutOnboardingService` so existing
 * provider implementations can be adapted incrementally.
 */
import { Injectable } from '@nestjs/common';
import {
  PayoutOnboardingInitiateOutput,
  PayoutOnboardingLinkedAccount,
  PayoutOnboardingAccountStatus,
  PayoutOnboardingWebhookEvent,
  PayoutOnboardingExpertContext,
} from '@/external/payout-onboarding/payout-onboarding.interface';
import { ProviderCapability, ProviderCapabilityProfile } from './provider-capability';
import { PayoutProviderError } from './payout-provider.errors';

/** Input to create a payout. */
export interface CreatePayoutInput {
  /** Internal payout row id (used as reference_id for idempotency). */
  readonly payoutId: number | string;
  /** Amount in minor units (paise for INR). */
  readonly amount: number;
  /** Currency code (e.g. 'INR'). */
  readonly currency: string;
  /** Provider-side payout destination id (RazorpayX: fund_account_id). */
  readonly destinationId: string;
  /** Optional narration shown on the bank statement. */
  readonly narration?: string;
  /** Optional idempotency key. */
  readonly idempotencyKey?: string;
}

/** Output from createPayout. */
export interface CreatePayoutOutput {
  /** Provider-side payout reference (RazorpayX: payout id). */
  readonly providerPayoutReference: string;
  /** Normalized status: 'created' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed'. */
  readonly status:
    | 'created'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'reversed';
  /** Provider-specific raw response. */
  readonly raw: Record<string, unknown>;
}

/** Output from getPayoutStatus. */
export interface PayoutStatusOutput {
  /** Provider-side payout reference. */
  readonly providerPayoutReference: string;
  /** Normalized status. */
  readonly status:
    | 'created'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'reversed';
  /** Provider-specific raw response. */
  readonly raw: Record<string, unknown>;
}

/** Unified payout provider interface. */
@Injectable()
export abstract class PayoutProvider {
  /** Stable provider key (matches `payment.providers.code`). */
  abstract readonly provider: string;

  /** What this provider can do and where. */
  abstract readonly capabilities: ProviderCapabilityProfile;

  // ── Onboarding ──────────────────────────────────────────────────────

  abstract initiate(
    ctx: PayoutOnboardingExpertContext,
  ): Promise<PayoutOnboardingInitiateOutput>;

  abstract complete(
    input: {
      code?: string;
      state?: string;
      accountHolderName?: string;
      accountNumber?: string;
      ifsc?: string;
    },
  ): Promise<PayoutOnboardingLinkedAccount>;

  abstract fetchAccountStatus(ctx: {
    externalAccountId: string;
    accessToken: string;
  }): Promise<PayoutOnboardingAccountStatus>;

  deactivate?(externalAccountId: string): Promise<void>;

  validatePennyDrop?(
    validationId: string,
    amount: number,
  ): Promise<{ validated: boolean }>;

  abstract parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<PayoutOnboardingWebhookEvent | null>;

  // ── Payout execution ────────────────────────────────────────────────

  abstract createPayout(input: CreatePayoutInput): Promise<CreatePayoutOutput>;

  abstract getPayoutStatus(
    providerPayoutReference: string,
  ): Promise<PayoutStatusOutput>;

  cancelPayout?(providerPayoutReference: string): Promise<void>;

  /** Convert a provider error to a normalized PayoutProviderError. */
  mapError(err: unknown): PayoutProviderError {
    return err instanceof PayoutProviderError
      ? err
      : new PayoutProviderError(
          err instanceof Error ? err.message : String(err),
          { code: 'unknown', providerCode: this.provider },
        );
  }
}

/** DI token for resolving the active payout provider. */
export const PAYOUT_PROVIDER = 'IPayoutProvider';
