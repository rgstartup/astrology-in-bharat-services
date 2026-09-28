import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from './client-account.schema';
import { clientWalletRecharges } from './client-wallet-recharge.schema';
import { clientTransactions } from './client-transaction.schema';

const clientSchema = pgSchema('client');

/**
 * Drizzle mirror of `ClientWallet` (`client.wallets` TypeORM entity).
 * Source: src/internal/domains/client/wallet/entities/client-wallet.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 */
export const clientWallets = clientSchema.table('wallets', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .unique()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  balance: numeric('balance', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  reserved_balance: numeric('reserved_balance', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clientWalletsRelations = relations(
  clientWallets,
  ({ one, many }) => ({
    client: one(clientAccounts, {
      fields: [clientWallets.client_id],
      references: [clientAccounts.id],
    }),
    recharges: many(clientWalletRecharges),
    transactions: many(clientTransactions),
  }),
);

export type ClientWalletRow = typeof clientWallets.$inferSelect;
export type NewClientWalletRow = typeof clientWallets.$inferInsert;
