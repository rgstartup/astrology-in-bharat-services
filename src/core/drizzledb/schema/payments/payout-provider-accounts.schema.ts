import {
  index,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { paymentProviders } from './providers.schema';

const paymentSchema = pgSchema('payments');

/**
 * Payout provider account status — lifecycle of a platform's configured provider account.
 */
export const payoutProviderAccountStatusEnum = pgEnum(
  'payout_provider_account_status_enum',
  ['ACTIVE', 'INACTIVE', 'DISABLED'],
);

/**
 * Platform's configured payout provider account.
 *
 * Represents a provider integration/configuration (not an individual partner).
 * Stores only a credentials_reference (env var or secrets manager key), never
 * plaintext secrets. One record per provider/account/region/environment so that
 * RazorpayX test, RazorpayX prod, Cashfree, etc. are each independently selectable.
 *
 * Related to payout_onboardings and payouts so the selected provider config is
 * persisted for the lifetime of each onboarding attempt and payout request.
 */
export const payoutProviderAccounts = paymentSchema.table(
  'payout_provider_accounts',
  {
    id: serial('id').primaryKey(),
    /** FK to payment_providers catalog (razorpay, stripe, paypal, cashfree…). */
    provider_id: integer('provider_id')
      .notNull()
      .references(() => paymentProviders.id, { onDelete: 'restrict' }),
    /** Internal configuration name (e.g. "razorpayx-prod-india"). */
    name: text('name').notNull(),
    environment: text('environment').notNull().default('test'),
    country_code: text('country_code').notNull().default('IN'),
    currency_code: text('currency_code').notNull().default('INR'),
    is_enabled: boolean('is_enabled').notNull().default(true),
    /** Reference to securely stored credentials (env var / secrets manager key). */
    credentials_reference: text('credentials_reference').notNull(),
    /** Non-secret provider-specific configuration (JSON). */
    configuration: json('configuration').$type<Record<string, unknown> | null>(),
    status: payoutProviderAccountStatusEnum('status')
      .notNull()
      .default('ACTIVE'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: uniqueIndex(
      'payout_provider_accounts_provider_environment_idx',
    ).on(table.provider_id, table.environment),
  }),
);

export const payoutProviderAccountsRelations = relations(
  payoutProviderAccounts,
  ({ one }) => ({
    provider: one(paymentProviders, {
      fields: [payoutProviderAccounts.provider_id],
      references: [paymentProviders.id],
    }),
  }),
);

export type PayoutProviderAccountRow =
  typeof payoutProviderAccounts.$inferSelect;
export type NewPayoutProviderAccountRow =
  typeof payoutProviderAccounts.$inferInsert;
