import {
  integer,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { earningSubjectTypeEnum } from './earning-enums.schema';
import { earningPolicies } from './earning-policies.schema';

const financeSchema = pgSchema('finance');

export const earningPolicyAssignments = financeSchema.table(
  'earning_policy_assignments',
  {
    id: serial('id').primaryKey(),
    earning_policy_id: integer('earning_policy_id')
      .references(() => earningPolicies.id, { onDelete: 'cascade' })
      .notNull(),
    subject_type: earningSubjectTypeEnum('subject_type').notNull(),
    subject_id: integer('subject_id'),
    effective_from: timestamp('effective_from', { withTimezone: true }).notNull(),
    effective_until: timestamp('effective_until', { withTimezone: true }),
    priority: integer('priority').default(0).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const earningPolicyAssignmentsRelations = relations(
  earningPolicyAssignments,
  ({ one }) => ({
    policy: one(earningPolicies, {
      fields: [earningPolicyAssignments.earning_policy_id],
      references: [earningPolicies.id],
    }),
  }),
);

export type EarningPolicyAssignmentRow =
  typeof earningPolicyAssignments.$inferSelect;
export type NewEarningPolicyAssignmentRow =
  typeof earningPolicyAssignments.$inferInsert;
