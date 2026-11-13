import {
  index,
  json,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutAccounts } from './payout-accounts.schema';
import { payoutProviderAccounts } from './payout-provider-accounts.schema';

const paymentSchema = pgSchema('payments');

/**
 * Type of provider resource referenced from an internal payout account.
 */
export const payoutAccountReferenceTypeEnum = pgEnum(
  'payout_account_reference_type_enum',
  [
    'contact',
    'fund_account',
    'beneficiary',
    'connected_account',
    'external_account',
    'provider_customer',
    'other',
  ],
);

/**
 * External provider resources associated with an internal payout account.
 *
 * Different providers may require multiple resources for one partner:
 *   RazorpayX → contact + fund_account
 *   Stripe    → connected_account
 *   Cashfree  → beneficiary
 *
 * Enforce uniqueness of (payout_provider_account_id, reference_type,
 * provider_reference) so the same provider resource isn't attached twice.
 */
export const payoutAccountReferences = paymentSchema.table(
  'payout_account_references',
  {
    id: serial('id').primaryKey(),
    /** FK to internal payout_accounts record. */
    payout_account_id: integer('payout_account_id')
      .notNull()
      .references(() => payoutAccounts.id, { onDelete: 'cascade' }),
    /** Which provider config owns this resource reference. */
    payout_provider_account_id: integer('payout_provider_account_id')
      .notNull()
      .references(() => payoutProviderAccounts.id, { onDelete: 'restrict' }),
    reference_type: payoutAccountReferenceTypeEnum('reference_type')
      .notNull(),
    provider_reference: text('provider_reference').notNull(),
    /** Safe provider-specific metadata (JSON). */
    provider_metadata: json('provider_metadata').$type<
      Record<string, unknown> | null
    >(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    payoutAccountIdx: index('payout_account_references_account_idx').on(
      table.payout_account_id,
    ),
    uniqueResource: uniqueIndex(
      'payout_account_references_unique_resource_idx',
    ).on(
      table.payout_provider_account_id,
      table.reference_type,
      table.provider_reference,
    ),
  }),
);

export const payoutAccountReferencesRelations = relations(
  payoutAccountReferences,
  ({ one }) => ({
    payoutAccount: one(payoutAccounts, {
      fields: [payoutAccountReferences.payout_account_id],
      references: [payoutAccounts.id],
    }),
    providerAccount: one(payoutProviderAccounts, {
      fields: [payoutAccountReferences.payout_provider_account_id],
      references: [payoutProviderAccounts.id],
    }),
  }),
);

export type PayoutAccountReferenceRow =
  typeof payoutAccountReferences.$inferSelect;
export type NewPayoutAccountReferenceRow =
  typeof payoutAccountReferences.$inferInsert;
