/**
 * Provider capability profile.
 *
 * Declares what a payout provider can do (onboarding, payout execution,
 * webhook ingestion) and which countries/currencies it supports. Used by
 * `PayoutProviderResolver` to pick the right provider for a given payout.
 */
export type ProviderCapability = 'onboarding' | 'payout' | 'webhook';

export interface ProviderCapabilityProfile {
  readonly capabilities: ProviderCapability[];
  readonly countryCodes: string[];
  readonly currencyCodes: string[];
}

export const RAZORPAYX_CAPABILITIES: ProviderCapabilityProfile = {
  capabilities: ['onboarding', 'payout', 'webhook'],
  countryCodes: ['IN'],
  currencyCodes: ['INR'],
};
