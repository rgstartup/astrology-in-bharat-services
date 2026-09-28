import {
  integer,
  numeric,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import { expertAccounts } from '../../expert/expert-account.schema';
import { transactions } from './transactions.schema';

const financeSchema = pgSchema('finance');

export type WalletKey = 'client_id' | 'expert_id' | 'merchant_id' | 'agent_id';

/**
 * Drizzle mirror of `Wallet` (`finance.wallets` TypeORM entity).
 * Source: src/internal/finance/wallet/entities/wallet.entity.ts
 */
export const wallets = financeSchema.table('wallets', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').references(() => clientAccounts.id, {
    onDelete: 'set null',
  }),
  expert_id: integer('expert_id').references(() => expertAccounts.id, {
    onDelete: 'set null',
  }),
  merchant_id: integer('merchant_id'),
  agent_id: integer('agent_id'),
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

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  client: one(clientAccounts, {
    fields: [wallets.client_id],
    references: [clientAccounts.id],
  }),
  expert: one(expertAccounts, {
    fields: [wallets.expert_id],
    references: [expertAccounts.id],
  }),
  transactions: many(transactions),
}));

export type WalletRow = typeof wallets.$inferSelect;
export type NewWalletRow = typeof wallets.$inferInsert;
