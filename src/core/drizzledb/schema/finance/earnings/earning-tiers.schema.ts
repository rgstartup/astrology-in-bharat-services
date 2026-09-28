import {
  integer,
  numeric,
  pgSchema,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { earningPolicies } from './earning-policies.schema';

const financeSchema = pgSchema('finance');

/**
 * Drizzle mirror of `EarningTier` (`finance.earning_tiers` TypeORM entity).
 * Source: src/internal/finance/earnings/entities/earning-tier.entity.ts
 */
export const earningTiers = financeSchema.table('earning_tiers', {
  id: serial('id').primaryKey(),
  policy_id: integer('policy_id')
    .notNull()
    .references(() => earningPolicies.id, { onDelete: 'cascade' }),
  min_threshold: numeric('min_threshold', { precision: 10, scale: 2 }).notNull(),
  max_threshold: numeric('max_threshold', { precision: 10, scale: 2 }),
  platform_rate: numeric('platform_rate', { precision: 10, scale: 2 }).notNull(),
  agent_rate: numeric('agent_rate', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
});

export const earningTiersRelations = relations(earningTiers, ({ one }) => ({
  policy: one(earningPolicies, {
    fields: [earningTiers.policy_id],
    references: [earningPolicies.id],
  }),
}));

export type EarningTierRow = typeof earningTiers.$inferSelect;
export type NewEarningTierRow = typeof earningTiers.$inferInsert;
