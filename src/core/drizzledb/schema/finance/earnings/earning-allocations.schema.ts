import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { EarningAllocationStatus } from '@/core/enums';
import {
  earningRecipientTypeEnum,
  earningCalculationMethodEnum,
  earningAllocationStatusEnum,
} from './earning-enums.schema';
import { earningEvents } from './earning-events.schema';
import { earningPolicies } from './earning-policies.schema';
import { earningPolicyRules } from './earning-policy-rules.schema';

const financeSchema = pgSchema('finance');

export const earningAllocations = financeSchema.table('earning_allocations', {
  id: serial('id').primaryKey(),
  earning_event_id: integer('earning_event_id')
    .references(() => earningEvents.id)
    .notNull(),
  earning_policy_id: integer('earning_policy_id')
    .references(() => earningPolicies.id)
    .notNull(),
  earning_policy_rule_id: integer('earning_policy_rule_id')
    .references(() => earningPolicyRules.id)
    .notNull(),
  recipient_type: earningRecipientTypeEnum('recipient_type').notNull(),
  recipient_id: integer('recipient_id'),
  base_amount: numeric('base_amount', { precision: 14, scale: 2 }).notNull(),
  calculation_method: earningCalculationMethodEnum('calculation_method').notNull(),
  applied_rate: numeric('applied_rate', { precision: 10, scale: 4 }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  status: earningAllocationStatusEnum('status')
    .default(EarningAllocationStatus.CALCULATED)
    .notNull(),
  settled_at: timestamp('settled_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const earningAllocationsRelations = relations(
  earningAllocations,
  ({ one }) => ({
    event: one(earningEvents, {
      fields: [earningAllocations.earning_event_id],
      references: [earningEvents.id],
    }),
    policy: one(earningPolicies, {
      fields: [earningAllocations.earning_policy_id],
      references: [earningPolicies.id],
    }),
    rule: one(earningPolicyRules, {
      fields: [earningAllocations.earning_policy_rule_id],
      references: [earningPolicyRules.id],
    }),
  }),
);

export type EarningAllocationRow = typeof earningAllocations.$inferSelect;
export type NewEarningAllocationRow = typeof earningAllocations.$inferInsert;
