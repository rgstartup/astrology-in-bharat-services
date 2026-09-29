import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  ClientTransactionPurpose,
  ClientTransactionType,
} from '../../../../internal/domains/client/wallet/enum';
import { clientWallets } from './client-wallet.schema';

const clientSchema = pgSchema('client');

export const clientTransactionTypeEnum = pgEnum(
  'wallet_transactions_type_enum',
  ClientTransactionType,
);

export const clientTransactionPurposeEnum = pgEnum(
  'wallet_transactions_purpose_enum',
  ClientTransactionPurpose,
);

/**
 * Drizzle mirror of `ClientTransaction` (`client.wallet_transactions` TypeORM entity).
 * Source: src/internal/domains/client/wallet/entities/client-transaction.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 *
 * Notes:
 * - PG enum type names (`wallet_transactions_type_enum`,
 *   `wallet_transactions_purpose_enum`) match the TypeORM-generated types;
 *   do not rename without a DB migration.
 */
export const clientTransactions = clientSchema.table(
  'wallet_transactions',
  {
    id: serial('id').primaryKey(),
    wallet_id: integer('wallet_id')
      .notNull()
      .references(() => clientWallets.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    balance_before: numeric('balance_before', { precision: 10, scale: 2 }),
    balance_after: numeric('balance_after', { precision: 10, scale: 2 }),
    type: clientTransactionTypeEnum('type').notNull(),
    purpose: clientTransactionPurposeEnum('purpose').notNull(),
    reference_id: text('reference_id'),
    reference_type: text('reference_type'),
    transaction_no: text('transaction_no'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('wallet_transactions_transaction_no_idx').on(t.transaction_no),
  ],
);

export const clientTransactionsRelations = relations(
  clientTransactions,
  ({ one }) => ({
    wallet: one(clientWallets, {
      fields: [clientTransactions.wallet_id],
      references: [clientWallets.id],
    }),
  }),
);

export type ClientTransactionRow = typeof clientTransactions.$inferSelect;
export type NewClientTransactionRow = typeof clientTransactions.$inferInsert;
