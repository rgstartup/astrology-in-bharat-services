import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { financialTransactions } from './financial-transactions.schema';
import { financialAccounts } from './financial-accounts.schema';

const financeSchema = pgSchema('finance');

export const financialTransactionEntries = financeSchema.table(
  'financial_transaction_entries',
  {
    id: serial('id').primaryKey(),
    transaction_id: integer('transaction_id')
      .references(() => financialTransactions.id, { onDelete: 'cascade' })
      .notNull(),
    account_id: integer('account_id')
      .references(() => financialAccounts.id)
      .notNull(),
    debit_amount: numeric('debit_amount', { precision: 14, scale: 2 })
      .default('0')
      .notNull(),
    credit_amount: numeric('credit_amount', { precision: 14, scale: 2 })
      .default('0')
      .notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const financialTransactionEntriesRelations = relations(
  financialTransactionEntries,
  ({ one }) => ({
    transaction: one(financialTransactions, {
      fields: [financialTransactionEntries.transaction_id],
      references: [financialTransactions.id],
    }),
    account: one(financialAccounts, {
      fields: [financialTransactionEntries.account_id],
      references: [financialAccounts.id],
    }),
  }),
);

export type FinancialTransactionEntryRow =
  typeof financialTransactionEntries.$inferSelect;
export type NewFinancialTransactionEntryRow =
  typeof financialTransactionEntries.$inferInsert;
