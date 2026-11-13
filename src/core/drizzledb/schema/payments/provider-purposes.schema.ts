import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { paymentProviders } from './providers.schema';

const paymentSchema = pgSchema('payments');

/**
 * Mapping of which payment provider handles which payment purpose.
 *
 * Single source of truth for platform→provider wiring per purpose. Example rows:
 *   purpose='partner_payouts', provider=razorpay
 *   purpose='customer_payments', provider=razorpay
 *   purpose='refunds', provider=razorpay
 *
 * If you migrate a purpose to a different provider later, update `provider_id`
 * here — a data change, not a code change.
 *
 * One row per (provider, purpose); `is_active` soft-deactivates without losing
 * history.
 */
export const providerPurposes = paymentSchema.table(
  'provider_purposes',
  {
    id: serial('id').primaryKey(),
    provider_id: integer('provider_id')
      .notNull()
      .references(() => paymentProviders.id, { onDelete: 'cascade' }),
    /** Payment purpose this provider serves (partner_payouts, customer_payments, refunds). */
    purpose: text('purpose').notNull().unique(),
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

export const providerPurposesRelations = relations(
  providerPurposes,
  ({ one }) => ({
    provider: one(paymentProviders, {
      fields: [providerPurposes.provider_id],
      references: [paymentProviders.id],
    }),
  }),
);

export type ProviderPurposeRow = typeof providerPurposes.$inferSelect;
export type NewProviderPurposeRow = typeof providerPurposes.$inferInsert;
