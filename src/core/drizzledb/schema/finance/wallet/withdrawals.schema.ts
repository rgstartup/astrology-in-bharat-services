import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { expertAccounts } from '../../expert/expert-account.schema';
import { users } from '../../users/users.schema';
import { WithdrawalStatus } from '../../../../../internal/finance/wallet/enum';

const financeSchema = pgSchema('finance');

export const withdrawalStatusEnum = pgEnum(
  'finance_withdrawals_status_enum',
  WithdrawalStatus,
);

/**
 * Drizzle mirror of `Withdrawal` (`finance.withdrawals` TypeORM entity).
 * Source: src/internal/finance/wallet/entities/withdrawal.entity.ts
 */
export const withdrawals = financeSchema.table('withdrawals', {
  id: serial('id').primaryKey(),
  withdrawal_no: text('withdrawal_no').unique(),
  expert_id: integer('expert_id').references(() => expertAccounts.id, {
    onDelete: 'set null',
  }),
  merchant_id: integer('merchant_id'),
  agent_profile_id: integer('agent_profile_id'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  bank_account_id: integer('bank_account_id'),
  merchant_bank_name: text('merchant_bank_name'),
  merchant_account_number: varchar('merchant_account_number', { length: 255 }),
  merchant_ifsc: varchar('merchant_ifsc', { length: 255 }),
  merchant_account_holder: text('merchant_account_holder'),
  status: withdrawalStatusEnum('status')
    .notNull()
    .default(WithdrawalStatus.PENDING),
  remark: text('remark'),
  transaction_reference: text('transaction_reference').unique(),
  admin_id: integer('admin_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  approval_date: timestamp('approval_date', { withTimezone: true }),
  ip_address: varchar('ip_address', { length: 100 }),
  user_agent: text('user_agent'),
  is_high_value: boolean('is_high_value').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  expert: one(expertAccounts, {
    fields: [withdrawals.expert_id],
    references: [expertAccounts.id],
  }),
  admin: one(users, {
    fields: [withdrawals.admin_id],
    references: [users.id],
  }),
}));

export type WithdrawalRow = typeof withdrawals.$inferSelect;
export type NewWithdrawalRow = typeof withdrawals.$inferInsert;
