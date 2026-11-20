import {
  index,
  json,
  jsonb,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutProviderConfigs } from './payout-provider-configs.schema';

const paymentSchema = pgSchema('payments');

/**
 * Normalized payout account status.
 */
export const payoutAccountStatusEnum = pgEnum(
  'payout_account_status_enum',
  ['pending', 'active', 'restricted', 'suspended', 'rejected', 'disabled'],
);

/**
 * Normalized verification status.
 */
export const payoutVerificationStatusEnum = pgEnum(
  'payout_verification_status_enum',
  ['not_started', 'pending', 'under_review', 'verified', 'rejected', 'requires_action'],
);

/**
 * Payout account type — determines which fields are required in `details`.
 */
export const payoutAccountTypeEnum = pgEnum(
  'payout_account_type_enum',
  ['bank_account', 'vpa', 'wallet', 'card', 'other'],
);

/**
 * Onboarding status — lifecycle of a payout account's provider onboarding.
 */
export const payoutAccountOnboardingStatusEnum = pgEnum(
  'payout_account_onboarding_status_enum',
  ['PENDING', 'INITIATED', 'VALIDATED', 'FAILED'],
);

/**
 * Internal payout account record — the platform's view of a partner's payout
 * destination or connected payout relationship. Provider-independent; no
 * sensitive bank details stored here unless encrypted.
 *
 * Multiple provider resource references live in payout_account_references.
 * Experts and merchants link via expert_payout_accounts / merchant_payout_accounts.
 */
export const payoutAccounts = paymentSchema.table(
  'payout_accounts',
  {
    id: serial('id').primaryKey(),
    /** FK to payout_provider_configs — provider config used for this account. */
    payout_provider_account_id: integer('payout_provider_account_id')
      .notNull()
      .references(() => payoutProviderConfigs.id, { onDelete: 'restrict' }),
    status: payoutAccountStatusEnum('status')
      .notNull()
      .default('pending'),
    verification_status: payoutVerificationStatusEnum('verification_status')
      .notNull()
      .default('not_started'),
    account_type: payoutAccountTypeEnum('account_type').notNull().default('bank_account'),
    country_code: text('country_code').notNull().default('IN'),
    currency_code: text('currency_code').notNull().default('INR'),
    /** Safe display name only — no bank details. */
    display_name: text('display_name'),
    /** Safe identifier/fingerprint for display (e.g. last-4 account). */
    account_fingerprint: text('account_fingerprint'),
    /** Type-specific structured details (bank_account: account_number_masked/bank_name/ifsc; vpa: vpa_id; wallet: wallet_handle; card: last4/brand). */
    details: jsonb('details').$type<Record<string, unknown> | null>(),
    /** Onboarding lifecycle status. */
    onboarding_status: payoutAccountOnboardingStatusEnum('onboarding_status').notNull().default('PENDING'),
    is_primary: boolean('is_primary').notNull().default(false),
    /** Non-sensitive provider-specific data (JSON). */
    provider_metadata: json('provider_metadata').$type<
      Record<string, unknown> | null
    >(),
    verified_at: timestamp('verified_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index('payout_accounts_provider_idx').on(
      table.payout_provider_account_id,
    ),
    statusIdx: index('payout_accounts_status_idx').on(table.status),
  }),
);

export const payoutAccountsRelations = relations(
  payoutAccounts,
  ({ one }) => ({
    providerAccount: one(payoutProviderConfigs, {
      fields: [payoutAccounts.payout_provider_account_id],
      references: [payoutProviderConfigs.id],
    }),
  }),
);

export type PayoutAccountRow = typeof payoutAccounts.$inferSelect;
export type NewPayoutAccountRow = typeof payoutAccounts.$inferInsert;
