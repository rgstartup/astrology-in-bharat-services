import {
  pgSchema,
  serial,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const paymentSchema = pgSchema('payments');

/**
 * Master table of available payment providers (external platforms).
 *
 * Examples: razorpay, stripe, paypal.
 *
 * This is the single source of truth for which providers your platform knows
 * about. `code` is the driver key used throughout the codebase
 * (e.g. `payment_provider` column in `expert.bank_accounts`, `provider`
 * key on `PaymentProviderOnboarder`).
 */
export const paymentProviders = paymentSchema.table(
  'providers',
  {
    id: serial('id').primaryKey(),
    /** Short provider key (razorpay, stripe, paypal). */
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [],
);

export const paymentProvidersRelations = relations(paymentProviders, ({}) => ({}));

export type PaymentProviderRow = typeof paymentProviders.$inferSelect;
export type NewPaymentProviderRow = typeof paymentProviders.$inferInsert;
