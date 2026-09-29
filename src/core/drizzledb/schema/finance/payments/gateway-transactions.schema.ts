import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import {
  GatewayIntent,
  GatewayName,
  GatewayTransactionStatus,
} from '@/internal/finance/payments/enums';

const financeSchema = pgSchema('finance');

export const gatewayNameEnum = pgEnum('finance_gateway_name_enum', GatewayName);

export const gatewayTransactionStatusEnum = pgEnum(
  'finance_gateway_transaction_status_enum',
  GatewayTransactionStatus,
);

export const gatewayIntentEnum = pgEnum(
  'finance_gateway_intent_enum',
  GatewayIntent,
);

/**
 * Drizzle mirror of `GatewayTransaction` (`finance.gateway_transactions` TypeORM entity).
 * Source: src/internal/finance/payments/entities/gateway-transaction.entity.ts
 */
export const gatewayTransactions = financeSchema.table('gateway_transactions', {
  id: serial('id').primaryKey(),
  gateway_name: gatewayNameEnum('gateway_name')
    .notNull()
    .default(GatewayName.RAZORPAY),
  client_id: integer('client_id').references(() => clientAccounts.id, {
    onDelete: 'set null',
  }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: gatewayTransactionStatusEnum('status')
    .notNull()
    .default(GatewayTransactionStatus.PENDING),
  intent: gatewayIntentEnum('intent').notNull(),
  gateway_order_id: text('gateway_order_id').unique(),
  gateway_payment_id: text('gateway_payment_id').unique(),
  gateway_signature: text('gateway_signature'),
  reference_id: text('reference_id'),
  reference_type: varchar('reference_type', { length: 50 }),
  failure_reason: text('failure_reason'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const gatewayTransactionsRelations = relations(
  gatewayTransactions,
  ({ one }) => ({
    client: one(clientAccounts, {
      fields: [gatewayTransactions.client_id],
      references: [clientAccounts.id],
    }),
  }),
);

export type GatewayTransactionRow = typeof gatewayTransactions.$inferSelect;
export type NewGatewayTransactionRow = typeof gatewayTransactions.$inferInsert;
