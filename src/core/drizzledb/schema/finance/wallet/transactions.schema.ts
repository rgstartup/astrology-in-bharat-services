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
import { wallets } from './wallets.schema';
import {
  TransactionPurpose,
  TransactionType,
} from '../../../../../internal/finance/wallet/enum';

const financeSchema = pgSchema('finance');

export const financeTransactionTypeEnum = pgEnum(
  'finance_transactions_type_enum',
  TransactionType,
);

export const financeTransactionPurposeEnum = pgEnum(
  'finance_transactions_purpose_enum',
  TransactionPurpose,
);

/**
 * Drizzle mirror of `Transaction` (`finance.transactions` TypeORM entity).
 * Source: src/internal/finance/wallet/entities/transaction.entity.ts
 */
export const transactions = financeSchema.table('transactions', {
  id: serial('id').primaryKey(),
  wallet_id: integer('wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  balance_before: numeric('balance_before', { precision: 10, scale: 2 }),
  balance_after: numeric('balance_after', { precision: 10, scale: 2 }),
  type: financeTransactionTypeEnum('type').notNull(),
  purpose: financeTransactionPurposeEnum('purpose').notNull(),
  reference_id: text('reference_id'),
  transaction_no: text('transaction_no').unique(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.wallet_id],
    references: [wallets.id],
  }),
}));

export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
