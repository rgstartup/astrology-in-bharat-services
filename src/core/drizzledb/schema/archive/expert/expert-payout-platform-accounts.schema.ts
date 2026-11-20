import { boolean, integer, pgSchema, serial, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertAccounts } from '../../expert/expert-account.schema';
import { payoutPlatformAccounts } from '../payments/payout-platform-accounts.schema';

const expertSchema = pgSchema('expert');

/**
 * One-sided relation table linking experts to payout platform accounts.
 *
 * `payments.payout_platform_accounts` holds the independent payout-account records
 * (platform contact/fund ids, bank details, validation status). This table relates
 * an expert to one or more payout platform accounts and carries per-link data such as
 * `is_primary` (the expert's chosen default among their own accounts).
 *
 * An expert can link multiple payout accounts; each link is its own row.
 * Re-linking creates a new row.
 */
export const expertPayoutPlatformAccounts = expertSchema.table(
  'expert_payout_platform_accounts',
  {
    id: serial('id').primaryKey(),
    expertId: integer('expert_id')
      .notNull()
      .references(() => expertAccounts.id, { onDelete: 'cascade' }),
    payoutPlatformAccountId: integer('payout_platform_account_id')
      .notNull()
      .references(() => payoutPlatformAccounts.id, { onDelete: 'cascade' }),
    /** Per-expert flag: which of this expert's linked payout accounts is primary. */
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [],
);

export const expertPayoutPlatformAccountsRelations = relations(
  expertPayoutPlatformAccounts,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertPayoutPlatformAccounts.expertId],
      references: [expertAccounts.id],
    }),
    payoutPlatformAccount: one(payoutPlatformAccounts, {
      fields: [expertPayoutPlatformAccounts.payoutPlatformAccountId],
      references: [payoutPlatformAccounts.id],
    }),
  }),
);

export type ExpertPayoutPlatformAccountRow =
  typeof expertPayoutPlatformAccounts.$inferSelect;
export type NewExpertPayoutPlatformAccountRow =
  typeof expertPayoutPlatformAccounts.$inferInsert;
