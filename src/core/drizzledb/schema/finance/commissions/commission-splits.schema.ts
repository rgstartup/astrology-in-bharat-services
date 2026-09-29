import {
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { SplitReferenceType } from '../../../../enums';
import { commissionRules } from './commission-rules.schema';
import { users } from '../../users/users.schema';

const financeSchema = pgSchema('finance');

export const splitReferenceTypeEnum = pgEnum(
  'finance_commission_splits_reference_type_enum',
  SplitReferenceType,
);

/**
 * Drizzle mirror of `CommissionSplit` (`finance.commission_splits` TypeORM entity).
 * Source: src/internal/finance/commissions/entities/commission-split.entity.ts
 */
export const commissionSplits = financeSchema.table('commission_splits', {
  id: serial('id').primaryKey(),
  reference_id: text('reference_id').notNull(),
  reference_type: splitReferenceTypeEnum('reference_type').notNull(),
  gross_amount: numeric('gross_amount', { precision: 10, scale: 2 }).notNull(),
  gst: numeric('gst', { precision: 10, scale: 2 }).notNull().default('0'),
  seller_agent_commission: numeric('seller_agent_commission', {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default('0'),
  buyer_agent_commission: numeric('buyer_agent_commission', {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default('0'),
  referral_commission: numeric('referral_commission', {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default('0'),
  provider_net: numeric('provider_net', { precision: 10, scale: 2 }).notNull(),
  client_profile_id: integer('client_profile_id'),
  provider_profile_id: integer('provider_profile_id'),
  seller_agent_profile_id: integer('seller_agent_profile_id'),
  buyer_agent_profile_id: integer('buyer_agent_profile_id'),
  beneficiary_user_id: integer('beneficiary_user_id').references(
    () => users.id,
    { onDelete: 'set null' },
  ),
  commission_rule_id: integer('commission_rule_id').references(
    () => commissionRules.id,
    { onDelete: 'set null' },
  ),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commissionSplitsRelations = relations(
  commissionSplits,
  ({ one }) => ({
    rule: one(commissionRules, {
      fields: [commissionSplits.commission_rule_id],
      references: [commissionRules.id],
    }),
    beneficiaryUser: one(users, {
      fields: [commissionSplits.beneficiary_user_id],
      references: [users.id],
    }),
  }),
);

export type CommissionSplitRow = typeof commissionSplits.$inferSelect;
export type NewCommissionSplitRow = typeof commissionSplits.$inferInsert;
