import { boolean, integer, pgSchema, serial, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { expertAccounts } from "./expert-account.schema";
import { payoutAccounts } from "../payments/payout-accounts.schema";

const expertSchema = pgSchema("expert");

/**
 * Relation table linking experts to provider-independent payout accounts.
 *
 * `payments.payout_accounts` holds the internal payout-account record
 * (status, verification, provider metadata). This table relates an expert
 * to one or more payout accounts and carries per-link data such as
 * `is_primary` (the expert's chosen default among their own accounts).
 *
 * An expert can link multiple payout accounts; each link is its own row.
 */
export const expertPayoutAccountLinks = expertSchema.table(
  "expert_payout_account_links",
  {
    id: serial("id").primaryKey(),
    expert_id: integer("expert_id")
      .notNull()
      .references(() => expertAccounts.id, { onDelete: "cascade" }),
    payout_account_id: integer("payout_account_id")
      .notNull()
      .references(() => payoutAccounts.id, { onDelete: "cascade" }),
    /** Per-expert flag: which of this expert's linked payout accounts is primary. */
    is_primary: boolean("is_primary").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [],
);

export const expertPayoutAccountLinksRelations = relations(
  expertPayoutAccountLinks,
  ({ one }) => ({
    expert: one(expertAccounts, {
      fields: [expertPayoutAccountLinks.expert_id],
      references: [expertAccounts.id],
    }),
    payoutAccount: one(payoutAccounts, {
      fields: [expertPayoutAccountLinks.payout_account_id],
      references: [payoutAccounts.id],
    }),
  }),
);

export type ExpertPayoutAccountLinkRow = typeof expertPayoutAccountLinks.$inferSelect;
export type NewExpertPayoutAccountLinkRow =
  typeof expertPayoutAccountLinks.$inferInsert;
