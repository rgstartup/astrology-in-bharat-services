import {
  index,
  integer,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutAccounts } from './payout-accounts.schema';
import { payoutProviderConfigs } from './payout-provider-configs.schema';

const paymentSchema = pgSchema('payments');

/**
 * Normalized payout status.
 */
export const payoutStatusEnum = pgEnum(
  'payout_status_enum',
  ['created', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'reversed'],
);

/**
 * Payout transaction — an actual money movement to a partner's payout account.
 *
 * Retains the payout_provider_account_id selected at creation so existing
 * payouts keep using their original provider even if the platform default changes.
 * Amounts stored in integer minor units (paise).
 */
export const payouts = paymentSchema.table(
  'payouts',
  {
    id: serial('id').primaryKey(),
    /** FK to internal payout_accounts — destination payout account. */
    payout_account_id: integer('payout_account_id')
      .notNull()
      .references(() => payoutAccounts.id, { onDelete: 'restrict' }),
    /** FK to payout_provider_configs — provider config used at initiation time. */
    payout_provider_account_id: integer('payout_provider_account_id')
      .notNull()
      .references(() => payoutProviderConfigs.id, { onDelete: 'restrict' }),
    /** Amount in minor units (e.g. paise for INR). */
    amount: integer('amount').notNull(),
    currency_code: text('currency_code').notNull().default('INR'),
    status: payoutStatusEnum('status')
      .notNull()
      .default('created'),
    /** Internal idempotency key for dedupe of payout requests. */
    idempotency_key: text('idempotency_key').notNull().unique(),
    /** Provider's payout ID (returned by adapter on initiation). */
    provider_payout_reference: text('provider_payout_reference'),
    failure_code: text('failure_code'),
    failure_message: text('failure_message'),
    initiated_at: timestamp('initiated_at', { withTimezone: true }),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    failed_at: timestamp('failed_at', { withTimezone: true }),
    /** Non-sensitive contextual data (JSON). */
    metadata: json('metadata').$type<Record<string, unknown> | null>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    payoutAccountIdx: index('payouts_payout_account_idx').on(
      table.payout_account_id,
    ),
    providerIdx: index('payouts_provider_idx').on(
      table.payout_provider_account_id,
    ),
    statusIdx: index('payouts_status_idx').on(table.status),
    idempotencyIdx: uniqueIndex('payouts_idempotency_key_unique_idx').on(
      table.idempotency_key,
    ),
  }),
);

export const payoutsRelations = relations(payouts, ({ one }) => ({
  payoutAccount: one(payoutAccounts, {
    fields: [payouts.payout_account_id],
    references: [payoutAccounts.id],
  }),
  providerAccount: one(payoutProviderConfigs, {
    fields: [payouts.payout_provider_account_id],
    references: [payoutProviderConfigs.id],
  }),
}));

export type PayoutRow = typeof payouts.$inferSelect;
export type NewPayoutRow = typeof payouts.$inferInsert;
