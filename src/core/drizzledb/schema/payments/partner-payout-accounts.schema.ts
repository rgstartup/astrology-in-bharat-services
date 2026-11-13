import {
  integer,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const paymentSchema = pgSchema('payments');

/**
 * Lifecycle of a partner payout account onboarding with a payment provider.
 *
 * - PENDING: link initiated, expert has not completed provider onboarding yet
 * - AUTHORIZED: expert authorized on provider; tokens received, account not yet active
 * - ACTIVE: provider account activated; expert can receive payouts
 * - FAILED: linking failed (KYC rejection, token exchange failure, etc.)
 *
 * This is the application's own onboarding lifecycle — separate from the
 * provider's raw account status stored in `account_status`.
 */
export const partnerPayoutAccountStatusEnum = pgEnum(
  'partner_payout_account_status_enum',
  ['PENDING', 'AUTHORIZED', 'ACTIVE', 'FAILED'],
);

/**
 * Drizzle schema for a partner payout account (`payment.partner_payout_accounts`).
 *
 * Independent payout-account records — one per provider link attempt. Stores only
 * provider-side identifiers and encrypted OAuth tokens — no bank account numbers,
 * IFSC codes, PAN or KYC details are persisted here. Bank/KYC details live entirely
 * on the provider's hosted onboarding flow.
 *
 * Experts relate to these via `expert.expert_payout_accounts` (one-sided relation
 * table), so the same partner payout account could be shared or re-linked later.
 *
 * `payment_provider` matches `payment.providers.code` (razorpay, stripe, …).
 * `provider_product` distinguishes integration products of the same provider
 * (e.g. partner_oauth vs razorpayx vs route).
 */
export const partnerPayoutAccounts = paymentSchema.table(
  'partner_payout_accounts',
  {
    id: serial('id').primaryKey(),
    payment_provider: text('payment_provider').notNull(),
    provider_product: text('provider_product').notNull(),
    onboarding_status: partnerPayoutAccountStatusEnum('onboarding_status')
      .notNull()
      .default('PENDING'),
    account_status: text('account_status'),
    failure_reason: text('failure_reason'),
    /** Provider account id (e.g. Razorpay acc_xxx, Stripe acct_123). */
    external_account_id: text('external_account_id'),
    /** Encrypted provider access token. */
    provider_access_token: text('provider_access_token'),
    /** Encrypted provider refresh token. */
    provider_refresh_token: text('provider_refresh_token'),
    token_expires_at: timestamp('token_expires_at', { withTimezone: true }),
    /** One-time OAuth state value bound to the callback for this row. */
    state: text('state'),
    /** Frontend redirect URI to return to after callback (set during initiate). */
    redirectUri: text('redirect_uri'),
    authorized_at: timestamp('authorized_at', { withTimezone: true }),
    activated_at: timestamp('activated_at', { withTimezone: true }),
    /** Provider-specific extras stored verbatim (driver-decided shape). */
    metadata: json('metadata').$type<Record<string, unknown> | null>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [],
);

export const partnerPayoutAccountsRelations = relations(
  partnerPayoutAccounts,
  ({}) => ({}),
);

export type PartnerPayoutAccountRow =
  typeof partnerPayoutAccounts.$inferSelect;
export type NewPartnerPayoutAccountRow =
  typeof partnerPayoutAccounts.$inferInsert;
