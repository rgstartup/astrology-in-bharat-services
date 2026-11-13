// Payment Providers
export {
  paymentProviders,
  paymentProvidersRelations,
} from './providers.schema';
export type {
  PaymentProviderRow,
  NewPaymentProviderRow,
} from './providers.schema';

// Provider Purposes
export {
  providerPurposes,
  providerPurposesRelations,
} from './provider-purposes.schema';
export type {
  ProviderPurposeRow,
  NewProviderPurposeRow,
} from './provider-purposes.schema';

// Partner Payout Accounts (OAuth-based onboarding)
export {
  partnerPayoutAccounts,
  partnerPayoutAccountsRelations,
  partnerPayoutAccountStatusEnum,
} from './partner-payout-accounts.schema';
export type {
  PartnerPayoutAccountRow,
  NewPartnerPayoutAccountRow,
} from './partner-payout-accounts.schema';

// Payout Platform Accounts (direct API — RazorpayX penny-drop)
export {
  payoutPlatformAccounts,
  payoutPlatformAccountsRelations,
  payoutAccountValidationStatusEnum,
} from './payout-platform-accounts.schema';
export type {
  PayoutPlatformAccountRow,
  NewPayoutPlatformAccountRow,
} from './payout-platform-accounts.schema';

// Payout Provider Accounts (platform provider configurations)
export {
  payoutProviderAccounts,
  payoutProviderAccountsRelations,
  payoutProviderAccountStatusEnum,
} from './payout-provider-accounts.schema';
export type {
  PayoutProviderAccountRow,
  NewPayoutProviderAccountRow,
} from './payout-provider-accounts.schema';

// Payout Onboardings (onboarding attempt lifecycle)
export {
  payoutOnboardings,
  payoutOnboardingsRelations,
  payoutOnboardingStatusEnum,
  payoutOnboardingActionEnum,
} from './payout-onboardings.schema';
export type {
  PayoutOnboardingRow,
  NewPayoutOnboardingRow,
} from './payout-onboardings.schema';

// Payout Accounts (internal partner payout destination)
export {
  payoutAccounts,
  payoutAccountsRelations,
  payoutAccountStatusEnum,
  payoutVerificationStatusEnum,
} from './payout-accounts.schema';
export type {
  PayoutAccountRow,
  NewPayoutAccountRow,
} from './payout-accounts.schema';

// Payout Account References (provider resource references)
export {
  payoutAccountReferences,
  payoutAccountReferencesRelations,
  payoutAccountReferenceTypeEnum,
} from './payout-account-references.schema';
export type {
  PayoutAccountReferenceRow,
  NewPayoutAccountReferenceRow,
} from './payout-account-references.schema';

// Payouts (payout transactions)
export {
  payouts,
  payoutsRelations,
  payoutStatusEnum,
} from './payouts.schema';
export type {
  PayoutRow,
  NewPayoutRow,
} from './payouts.schema';

// Payout Webhook Events
export {
  payoutWebhookEvents,
  payoutWebhookEventsRelations,
  payoutWebhookProcessingStatusEnum,
} from './payout-webhook-events.schema';
export type {
  PayoutWebhookEventRow,
  NewPayoutWebhookEventRow,
} from './payout-webhook-events.schema';

// Merchant Payout Accounts (merchant → payout account relation)
export {
  merchantPayoutAccounts,
  merchantPayoutAccountsRelations,
} from './merchant-payout-accounts.schema';
export type {
  MerchantPayoutAccountRow,
  NewMerchantPayoutAccountRow,
} from './merchant-payout-accounts.schema';
