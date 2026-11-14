import { boolean, integer, pgSchema, serial, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { expertAccounts } from "./expert-account.schema";
import { partnerPayoutAccounts } from "../payments/partner-payout-accounts.schema";

const expertSchema = pgSchema("expert");

/**
 * One-sided relation table linking experts to partner payout accounts.
 *
 * `payment.partner_payout_accounts` holds the independent payout-account records
 * (provider tokens, status, external account id). This table relates an expert
 * to one or more partner payout accounts and carries per-link data such as
 * `is_primary` (the expert's chosen default among their own accounts).
 *
 * An expert can link multiple payout accounts; each link is its own row.
 * Re-linking creates a new row (old row can be soft-deleted at the application
 * level by updating onboarding_status to FAILED on the partner record).
 */
export const expertPayoutAccounts = expertSchema.table(
  "expert_payout_accounts",
  {
    id: serial("id").primaryKey(),
    expert_id: integer("expert_id")
      .notNull()
      .references(() => expertAccounts.id, { onDelete: "cascade" }),
    partner_payout_account_id: integer("partner_payout_account_id")
      .notNull()
      .references(() => partnerPayoutAccounts.id, { onDelete: "cascade" }),
    /** Per-expert flag: which of this expert's linked payout accounts is primary. */
    is_primary: boolean("is_primary").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [],
);

export const expertPayoutAccountsRelations = relations(
  expertPayoutAccounts,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertPayoutAccounts.expert_id],
      references: [expertAccounts.id],
    }),
    partnerPayoutAccount: one(partnerPayoutAccounts, {
      fields: [expertPayoutAccounts.partner_payout_account_id],
      references: [partnerPayoutAccounts.id],
    }),
  }),
);

export type ExpertPayoutAccountRow = typeof expertPayoutAccounts.$inferSelect;
export type NewExpertPayoutAccountRow =
  typeof expertPayoutAccounts.$inferInsert;
