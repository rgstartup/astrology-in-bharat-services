import {
  numeric,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { FinancialTransactionStatus } from '@/core/enums';
import {
  financialTransactionEventTypeEnum,
  financialTransactionReferenceTypeEnum,
  financialTransactionStatusEnum,
} from '../earnings/earning-enums.schema';
import { financialTransactionEntries } from './financial-transaction-entries.schema';

const financeSchema = pgSchema('finance');

export const financialTransactions = financeSchema.table(
  'financial_transactions',
  {
    id: serial('id').primaryKey(),
    transaction_ref: varchar('transaction_ref', { length: 120 })
      .notNull()
      .unique(),
    type: financialTransactionEventTypeEnum('type').notNull(),
    reference_type: financialTransactionReferenceTypeEnum('reference_type').notNull(),
    reference_id: varchar('reference_id', { length: 100 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    total_amount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    status: financialTransactionStatusEnum('status')
      .default(FinancialTransactionStatus.POSTED)
      .notNull(),
    posted_at: timestamp('posted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const financialTransactionsRelations = relations(
  financialTransactions,
  ({ many }) => ({
    entries: many(financialTransactionEntries),
  }),
);

export type FinancialTransactionRow =
  typeof financialTransactions.$inferSelect;
export type NewFinancialTransactionRow =
  typeof financialTransactions.$inferInsert;
