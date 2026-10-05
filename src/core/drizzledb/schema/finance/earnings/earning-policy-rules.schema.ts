import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { EarningRuleStatus } from '@/core/enums';
import {
  earningRecipientTypeEnum,
  earningCalculationMethodEnum,
  earningTierBasisEnum,
  earningRuleStatusEnum,
} from './earning-enums.schema';
import { earningPolicies } from './earning-policies.schema';

const financeSchema = pgSchema('finance');

export const earningPolicyRules = financeSchema.table('earning_policy_rules', {
  id: serial('id').primaryKey(),
  earning_policy_id: integer('earning_policy_id')
    .references(() => earningPolicies.id, { onDelete: 'cascade' })
    .notNull(),
  code: varchar('code', { length: 80 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  recipient_type: earningRecipientTypeEnum('recipient_type').notNull(),
  calculation_method: earningCalculationMethodEnum('calculation_method').notNull(),
  value: numeric('value', { precision: 12, scale: 4 }),
  currency: varchar('currency', { length: 3 }).default('INR'),
  tier_basis: earningTierBasisEnum('tier_basis'),
  status: earningRuleStatusEnum('status').default(EarningRuleStatus.DRAFT).notNull(),
  version: integer('version').default(1).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const earningPolicyRulesRelations = relations(
  earningPolicyRules,
  ({ one }) => ({
    policy: one(earningPolicies, {
      fields: [earningPolicyRules.earning_policy_id],
      references: [earningPolicies.id],
    }),
  }),
);

export type EarningPolicyRuleRow = typeof earningPolicyRules.$inferSelect;
export type NewEarningPolicyRuleRow = typeof earningPolicyRules.$inferInsert;
