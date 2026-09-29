import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  EarningAppliesRole,
  EarningEventType,
  EarningRateType,
} from '@/internal/finance/earnings/enum';
import { earningTiers } from './earning-tiers.schema';
import { earningSplits } from './earning-splits.schema';
import { users } from '../../users/users.schema';

const financeSchema = pgSchema('finance');

export const earningEventTypeEnum = pgEnum(
  'finance_earning_event_type_enum',
  EarningEventType,
);

export const earningRateTypeEnum = pgEnum(
  'finance_earning_rate_type_enum',
  EarningRateType,
);

export const earningAppliesRoleEnum = pgEnum(
  'finance_earning_applies_role_enum',
  EarningAppliesRole,
);

/**
 * Drizzle mirror of `EarningPolicy` (`finance.earning_policies` TypeORM entity).
 * Source: src/internal/finance/earnings/entities/earning-policy.entity.ts
 */
export const earningPolicies = financeSchema.table('earning_policies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  event_type: earningEventTypeEnum('event_type')
    .notNull()
    .default(EarningEventType.CALL),
  platform_cut_type: earningRateTypeEnum('platform_cut_type')
    .notNull()
    .default(EarningRateType.FIXED),
  platform_cut_value: numeric('platform_cut_value', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  buyer_platform_fee: numeric('buyer_platform_fee', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  gst_rate_percent: numeric('gst_rate_percent', { precision: 5, scale: 2 })
    .notNull()
    .default('18.00'),
  seller_agent_rate: numeric('seller_agent_rate', { precision: 6, scale: 4 })
    .notNull()
    .default('0'),
  buyer_agent_rate: numeric('buyer_agent_rate', { precision: 6, scale: 4 })
    .notNull()
    .default('0'),
  applies_to_role: earningAppliesRoleEnum('applies_to_role')
    .notNull()
    .default(EarningAppliesRole.ALL),
  applies_to_user_id: integer('applies_to_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  min_amount: numeric('min_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  max_cap: numeric('max_cap', { precision: 10, scale: 2 }),
  priority: integer('priority').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  effective_from: timestamp('effective_from', { withTimezone: true })
    .notNull()
    .defaultNow(),
  effective_to: timestamp('effective_to', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const earningPoliciesRelations = relations(
  earningPolicies,
  ({ one, many }) => ({
    tiers: many(earningTiers),
    splits: many(earningSplits),
    user: one(users, {
      fields: [earningPolicies.applies_to_user_id],
      references: [users.id],
    }),
  }),
);

export type EarningPolicyRow = typeof earningPolicies.$inferSelect;
export type NewEarningPolicyRow = typeof earningPolicies.$inferInsert;
