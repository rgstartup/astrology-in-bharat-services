import {
  index,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutProviderAccounts } from './payout-provider-accounts.schema';

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
    /** FK to payout_provider_accounts — provider config used for this account. */
    payout_provider_account_id: integer('payout_provider_account_id')
      .notNull()
      .references(() => payoutProviderAccounts.id, { onDelete: 'restrict' }),
    status: payoutAccountStatusEnum('status')
      .notNull()
      .default('pending'),
    verification_status: payoutVerificationStatusEnum('verification_status')
      .notNull()
      .default('not_started'),
    account_type: text('account_type').notNull().default('bank_account'),
    country_code: text('country_code').notNull().default('IN'),
    currency_code: text('currency_code').notNull().default('INR'),
    /** Safe display name only — no bank details. */
    display_name: text('display_name'),
    /** Safe identifier/fingerprint for display (e.g. last-4 account). */
    account_fingerprint: text('account_fingerprint'),
    /** Last 4 digits of bank account number — safe to display for expert UX. */
    account_number_masked: text('account_number_masked'),
    /** Bank name (nullable — may not be available from all providers). */
    bank_name: text('bank_name'),
    /** IFSC code (nullable for VPA/wallet types). */
    ifsc: text('ifsc'),
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
    providerAccount: one(payoutProviderAccounts, {
      fields: [payoutAccounts.payout_provider_account_id],
      references: [payoutProviderAccounts.id],
    }),
  }),
);

export type PayoutAccountRow = typeof payoutAccounts.$inferSelect;
export type NewPayoutAccountRow = typeof payoutAccounts.$inferInsert;
