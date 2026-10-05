import {
  integer,
  jsonb,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { earningPolicyRules } from './earning-policy-rules.schema';

const financeSchema = pgSchema('finance');

export interface TierSlab {
  min: number;
  max: number | null;
  value: number;
}

export const earningPolicyRuleTiers = financeSchema.table(
  'earning_policy_rule_tiers',
  {
    id: serial('id').primaryKey(),
    earning_policy_rule_id: integer('earning_policy_rule_id')
      .references(() => earningPolicyRules.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    tier_title: varchar('tier_title', { length: 150 }).notNull(),
    tiers: jsonb('tiers').$type<TierSlab[]>().notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const earningPolicyRuleTiersRelations = relations(
  earningPolicyRuleTiers,
  ({ one }) => ({
    rule: one(earningPolicyRules, {
      fields: [earningPolicyRuleTiers.earning_policy_rule_id],
      references: [earningPolicyRules.id],
    }),
  }),
);

export type EarningPolicyRuleTierRow = typeof earningPolicyRuleTiers.$inferSelect;
export type NewEarningPolicyRuleTierRow = typeof earningPolicyRuleTiers.$inferInsert;
