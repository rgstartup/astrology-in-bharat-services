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
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ClientRechargeStatus } from '@/internal/domains/client/wallet/enum';
import { clientWallets } from './client-wallet.schema';

const clientSchema = pgSchema('client');

export const clientRechargeStatusEnum = pgEnum(
  'wallet_recharges_status_enum',
  ClientRechargeStatus,
);

/**
 * Drizzle mirror of `ClientWalletRecharge` (`client.wallet_recharges` TypeORM entity).
 * Source: src/internal/domains/client/wallet/entities/client-wallet-recharge.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 *
 * Notes:
 * - PG enum type name (`wallet_recharges_status_enum`) matches the
 *   TypeORM-generated type; do not rename without a DB migration.
 * - `wallet_transaction_id` intentionally has NO FK (legacy column has no
 *   relation in the TypeORM entity either).
 */
export const clientWalletRecharges = clientSchema.table(
  'wallet_recharges',
  {
    id: serial('id').primaryKey(),
    wallet_id: integer('wallet_id')
      .notNull()
      .references(() => clientWallets.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    bonus_amount: numeric('bonus_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    gst_amount: numeric('gst_amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    total_payable: numeric('total_payable', {
      precision: 10,
      scale: 2,
    }).notNull(),
    status: clientRechargeStatusEnum('status')
      .notNull()
      .default(ClientRechargeStatus.PENDING),
    payment_gateway: varchar('payment_gateway', { length: 50 })
      .notNull()
      .default('razorpay'),
    gateway_order_id: text('gateway_order_id'),
    gateway_payment_id: text('gateway_payment_id'),
    gateway_signature: text('gateway_signature'),
    failure_reason: text('failure_reason'),
    wallet_transaction_id: integer('wallet_transaction_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('wallet_recharges_gateway_order_id_idx').on(t.gateway_order_id),
  ],
);

export const clientWalletRechargesRelations = relations(
  clientWalletRecharges,
  ({ one }) => ({
    wallet: one(clientWallets, {
      fields: [clientWalletRecharges.wallet_id],
      references: [clientWallets.id],
    }),
  }),
);

export type ClientWalletRechargeRow = typeof clientWalletRecharges.$inferSelect;
export type NewClientWalletRechargeRow =
  typeof clientWalletRecharges.$inferInsert;
