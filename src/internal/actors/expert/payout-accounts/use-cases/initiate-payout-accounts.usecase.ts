/**
 * Initiate a payout onboarding for an expert.
 *
 * Resolves the payout provider (via PayoutProviderResolver), creates a
 * payout_onboardings attempt row, and calls provider.initiate() to get the
 * onboarding result (form spec or redirect URL).
 */
import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { eq } from 'drizzle-orm';
import {
  payoutProviderConfigs,
  paymentProviders,
  payoutOnboardings,
} from '@/core/drizzledb/schema';
import { PayoutProviderService } from '../payout-provider.service';
import { PayoutProviderAccountNotConfiguredError } from '../errors';
import { PayoutOnboardingExpertContext } from '@/external/payouts/onboarding/payout-onboarding.interface';

export interface InitiatePayoutOnboardingInput {
  expertId: number;
  providerCode: string;
  redirectUri?: string;
}

export interface InitiatePayoutOnboardingOutput {
  type: 'form' | 'redirect';
  url: string;
  state?: string;
  fields?: string[];
  onboardingId: number;
}

@Injectable()
export class InitiatePayoutOnboardingUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly providerService: PayoutProviderService,
  ) {}

  async execute(input: InitiatePayoutOnboardingInput): Promise<InitiatePayoutOnboardingOutput> {
    // Resolve the provider; fall back to the default (razorpayx) if not registered.
    const provider = this.providerService.resolve(input.providerCode);

    // Look up the provider account config for this provider code (required FK).
    const [providerAccount] = await this.db
      .select({ id: payoutProviderConfigs.id })
      .from(payoutProviderConfigs)
      .innerJoin(
        paymentProviders,
        eq(payoutProviderConfigs.provider_id, paymentProviders.id),
      )
      .where(eq(paymentProviders.code, provider.provider))
      .limit(1);

    if (!providerAccount) {
      throw new PayoutProviderAccountNotConfiguredError(provider.provider);
    }

    // Create the onboarding attempt row (pending, linked to provider account).
    const [onboarding] = await this.db
      .insert(payoutOnboardings)
      .values({
        payout_provider_account_id: providerAccount.id,
        status: 'pending',
        action_required: 'none',
        action_url: null,
        provider_reference: null,
        provider_metadata: null,
        failure_code: null,
        failure_message: null,
        expires_at: null,
        completed_at: null,
      })
      .returning();

    // Ask the provider to initiate onboarding.
    const ctx: PayoutOnboardingExpertContext = {
      expertId: input.expertId,
      redirectUri: input.redirectUri ?? '',
      state: randomBytes(16).toString('hex'),
    };

    const result = await provider.initiate(ctx);

    if (result.type === 'redirect') {
      await this.db
        .update(payoutOnboardings)
        .set({
          status: 'in_progress',
          action_required: 'redirect',
          action_url: result.url,
        })
        .where(eq(payoutOnboardings.id, onboarding.id));
      return {
        type: 'redirect',
        url: result.url,
        state: result.state,
        onboardingId: onboarding.id,
      };
    }

    // Form flow — no redirect, expert fills form and submits via complete().
    await this.db
      .update(payoutOnboardings)
      .set({
        status: 'in_progress',
        action_required: 'submit_details',
      })
      .where(eq(payoutOnboardings.id, onboarding.id));
    return {
      type: 'form',
      url: '',
      fields: result.fields,
      onboardingId: onboarding.id,
    };
  }
}
