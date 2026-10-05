import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { EarningCalculationMethod } from '@/core/enums';
import {
  earningCalculationMethodEnum,
  earningRecipientTypeEnum,
} from './earning-enums.schema';
import { earningPolicyRules } from './earning-policy-rules.schema';

const financeSchema = pgSchema('finance');

export const earningPolicyRuleAllocations = financeSchema.table(
  'earning_policy_rule_allocations',
  {
    id: serial('id').primaryKey(),
    rule_id: integer('rule_id')
      .references(() => earningPolicyRules.id, { onDelete: 'cascade' })
      .notNull(),
    recipient_type: earningRecipientTypeEnum('recipient_type').notNull(),
    allocation_method: earningCalculationMethodEnum('allocation_method')
      .default(EarningCalculationMethod.PERCENTAGE)
      .notNull(),
    allocation_value: numeric('allocation_value', {
      precision: 8,
      scale: 4,
    }).notNull(),
    priority: integer('priority').default(0).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const earningPolicyRuleAllocationsRelations = relations(
  earningPolicyRuleAllocations,
  ({ one }) => ({
    rule: one(earningPolicyRules, {
      fields: [earningPolicyRuleAllocations.rule_id],
      references: [earningPolicyRules.id],
    }),
  }),
);

export type EarningPolicyRuleAllocationRow =
  typeof earningPolicyRuleAllocations.$inferSelect;
export type NewEarningPolicyRuleAllocationRow =
  typeof earningPolicyRuleAllocations.$inferInsert;
