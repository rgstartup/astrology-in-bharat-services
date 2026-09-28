import {
  bigserial,
  integer,
  numeric,
  pgSchema,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { EarningEventType } from '@/internal/finance/earnings/enum';
import { earningEventTypeEnum, earningPolicies } from './earning-policies.schema';

const financeSchema = pgSchema('finance');

/**
 * Drizzle mirror of `EarningSplit` (`finance.earning_splits` TypeORM entity).
 * Source: src/internal/finance/earnings/entities/earning-split.entity.ts
 */
export const earningSplits = financeSchema.table('earning_splits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  reference_id: varchar('reference_id', { length: 100 }).notNull(),
  reference_type: earningEventTypeEnum('reference_type')
    .notNull()
    .default(EarningEventType.CALL),
  gross_amount: numeric('gross_amount', { precision: 12, scale: 2 }).notNull(),
  platform_earning: numeric('platform_earning', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  gst_on_platform_fee: numeric('gst_on_platform_fee', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  provider_earning: numeric('provider_earning', {
    precision: 12,
    scale: 2,
  }).notNull(),
  seller_agent_earning: numeric('seller_agent_earning', {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default('0'),
  buyer_agent_earning: numeric('buyer_agent_earning', {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default('0'),
  client_profile_id: integer('client_profile_id'),
  provider_profile_id: integer('provider_profile_id'),
  seller_agent_profile_id: integer('seller_agent_profile_id'),
  buyer_agent_profile_id: integer('buyer_agent_profile_id'),
  policy_id: integer('policy_id').references(() => earningPolicies.id, {
    onDelete: 'set null',
  }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const earningSplitsRelations = relations(earningSplits, ({ one }) => ({
  policy: one(earningPolicies, {
    fields: [earningSplits.policy_id],
    references: [earningPolicies.id],
  }),
}));

export type EarningSplitRow = typeof earningSplits.$inferSelect;
export type NewEarningSplitRow = typeof earningSplits.$inferInsert;
