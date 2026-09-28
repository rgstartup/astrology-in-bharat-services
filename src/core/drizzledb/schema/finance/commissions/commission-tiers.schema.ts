import {
  integer,
  numeric,
  pgSchema,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { commissionRules } from './commission-rules.schema';

const financeSchema = pgSchema('finance');

/**
 * Drizzle mirror of `CommissionTier` (`finance.commission_tiers` TypeORM entity).
 * Source: src/internal/finance/commissions/entities/commission-tier.entity.ts
 */
export const commissionTiers = financeSchema.table('commission_tiers', {
  id: serial('id').primaryKey(),
  rule_id: integer('rule_id')
    .notNull()
    .references(() => commissionRules.id, { onDelete: 'cascade' }),
  from_amount: numeric('from_amount', { precision: 10, scale: 2 }).notNull(),
  to_amount: numeric('to_amount', { precision: 10, scale: 2 }),
  rate: numeric('rate', { precision: 6, scale: 4 }).notNull(),
  min_cap: numeric('min_cap', { precision: 10, scale: 2 }),
  max_cap: numeric('max_cap', { precision: 10, scale: 2 }),
});

export const commissionTiersRelations = relations(
  commissionTiers,
  ({ one }) => ({
    rule: one(commissionRules, {
      fields: [commissionTiers.rule_id],
      references: [commissionRules.id],
    }),
  }),
);

export type CommissionTierRow = typeof commissionTiers.$inferSelect;
export type NewCommissionTierRow = typeof commissionTiers.$inferInsert;
