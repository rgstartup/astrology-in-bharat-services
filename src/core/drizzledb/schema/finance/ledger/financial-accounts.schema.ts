import {
  integer,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { FinancialAccountStatus } from '@/core/enums';
import {
  financialAccountTypeEnum,
  financialAccountOwnerTypeEnum,
  financialAccountStatusEnum,
} from '../earnings/earning-enums.schema';

const financeSchema = pgSchema('finance');

export const financialAccounts = financeSchema.table('financial_accounts', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  owner_type: financialAccountOwnerTypeEnum('owner_type').notNull(),
  owner_id: integer('owner_id'),
  account_type: financialAccountTypeEnum('account_type').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  status: financialAccountStatusEnum('status')
    .default(FinancialAccountStatus.ACTIVE)
    .notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type FinancialAccountRow = typeof financialAccounts.$inferSelect;
export type NewFinancialAccountRow = typeof financialAccounts.$inferInsert;
