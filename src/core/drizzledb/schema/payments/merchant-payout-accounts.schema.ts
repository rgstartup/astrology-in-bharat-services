import {
  index,
  pgSchema,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { payoutAccounts } from './payout-accounts.schema';
import { merchantAccounts } from '../merchant/merchant-account.schema';

const paymentSchema = pgSchema('payments');

/**
 * Associates merchant owners with generic payout accounts.
 *
 * Parallel to expert_payout_accounts — experts and merchants share the same
 * payout account infrastructure through separate relation tables.
 */
export const merchantPayoutAccounts = paymentSchema.table(
  'merchant_payout_accounts',
  {
    id: serial('id').primaryKey(),
    merchant_id: integer('merchant_id')
      .notNull()
      .references(() => merchantAccounts.id, { onDelete: 'cascade' }),
    payout_account_id: integer('payout_account_id')
      .notNull()
      .references(() => payoutAccounts.id, { onDelete: 'cascade' }),
    is_primary: boolean('is_primary').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index('merchant_payout_accounts_merchant_idx').on(
      table.merchant_id,
    ),
    accountIdx: index('merchant_payout_accounts_account_idx').on(
      table.payout_account_id,
    ),
  }),
);

export const merchantPayoutAccountsRelations = relations(
  merchantPayoutAccounts,
  ({ one }) => ({
    merchant: one(merchantAccounts, {
      fields: [merchantPayoutAccounts.merchant_id],
      references: [merchantAccounts.id],
    }),
    payoutAccount: one(payoutAccounts, {
      fields: [merchantPayoutAccounts.payout_account_id],
      references: [payoutAccounts.id],
    }),
  }),
);

export type MerchantPayoutAccountRow =
  typeof merchantPayoutAccounts.$inferSelect;
export type NewMerchantPayoutAccountRow =
  typeof merchantPayoutAccounts.$inferInsert;
