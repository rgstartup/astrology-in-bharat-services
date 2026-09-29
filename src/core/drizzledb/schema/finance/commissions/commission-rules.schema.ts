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
  CommissionAppliesRole,
  CommissionEventType,
  CommissionRateType,
  CommissionType,
} from '../../../../enums';
import { commissionTiers } from './commission-tiers.schema';
import { commissionSplits } from './commission-splits.schema';

const financeSchema = pgSchema('finance');

export const commissionEventTypeEnum = pgEnum(
  'finance_commission_event_type_enum',
  CommissionEventType,
);

export const commissionTypeEnum = pgEnum(
  'finance_commission_type_enum',
  CommissionType,
);

export const commissionRateTypeEnum = pgEnum(
  'finance_commission_rate_type_enum',
  CommissionRateType,
);

export const commissionAppliesRoleEnum = pgEnum(
  'finance_commission_applies_role_enum',
  CommissionAppliesRole,
);

/**
 * Drizzle mirror of `CommissionRule` (`finance.commission_rules` TypeORM entity).
 * Source: src/internal/finance/commissions/entities/commission-rule.entity.ts
 */
export const commissionRules = financeSchema.table('commission_rules', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  event_type: commissionEventTypeEnum('event_type').notNull(),
  commission_type: commissionTypeEnum('commission_type').notNull(),
  rate: numeric('rate', { precision: 6, scale: 4 }).notNull(),
  rate_type: commissionRateTypeEnum('rate_type')
    .notNull()
    .default(CommissionRateType.PERCENTAGE),
  min_cap: numeric('min_cap', { precision: 10, scale: 2 }),
  max_cap: numeric('max_cap', { precision: 10, scale: 2 }),
  applies_to_role: commissionAppliesRoleEnum('applies_to_role')
    .notNull()
    .default(CommissionAppliesRole.ALL),
  applies_to_id: integer('applies_to_id'),
  priority: integer('priority').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  effective_from: timestamp('effective_from', { withTimezone: true })
    .notNull()
    .defaultNow(),
  effective_until: timestamp('effective_until', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commissionRulesRelations = relations(
  commissionRules,
  ({ many }) => ({
    tiers: many(commissionTiers),
    splits: many(commissionSplits),
  }),
);

export type CommissionRuleRow = typeof commissionRules.$inferSelect;
export type NewCommissionRuleRow = typeof commissionRules.$inferInsert;
