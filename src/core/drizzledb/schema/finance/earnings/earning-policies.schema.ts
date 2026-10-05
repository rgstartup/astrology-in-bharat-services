import {
  integer,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { EarningRuleStatus } from '@/core/enums';
import {
  earningCategoryEnum,
  earningTypeEnum,
  earningRuleStatusEnum,
} from './earning-enums.schema';
import { users } from '../../users/users.schema';

const financeSchema = pgSchema('finance');

export const earningPolicies = financeSchema.table('earning_policies', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  category: earningCategoryEnum('category').notNull(),
  type: earningTypeEnum('type').notNull(),
  version: integer('version').default(1).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  status: earningRuleStatusEnum('status').default(EarningRuleStatus.DRAFT).notNull(),
  effective_from: timestamp('effective_from', { withTimezone: true }).notNull(),
  effective_until: timestamp('effective_until', { withTimezone: true }),
  created_by: integer('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const earningPoliciesRelations = relations(
  earningPolicies,
  ({ one }) => ({
    creator: one(users, {
      fields: [earningPolicies.created_by],
      references: [users.id],
    }),
  }),
);

export type EarningPolicyRow = typeof earningPolicies.$inferSelect;
export type NewEarningPolicyRow = typeof earningPolicies.$inferInsert;
