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
import { PaymentTransactionStatus } from '../../../../../internal/commerce/order/enum';
import { orders } from './order.schema';
import { orderRefunds } from './order-refund.schema';

const commerceSchema = pgSchema('commerce');

export const paymentTransactionStatusEnum = pgEnum(
  'order_payments_status_enum',
  PaymentTransactionStatus,
);

/**
 * Drizzle mirror of `OrderPayment` (`commerce.order_payments` TypeORM entity).
 * Source: src/internal/commerce/order/entities/order-payment.entity.ts
 *
 * `wallet_transaction_id` intentionally has NO FK (legacy column has no
 * relation in the TypeORM entity either).
 */
export const orderPayments = commerceSchema.table('order_payments', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  payment_method: varchar('payment_method', { length: 50 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: paymentTransactionStatusEnum('status')
    .notNull()
    .default(PaymentTransactionStatus.PENDING),
  gateway_order_id: varchar('gateway_order_id', { length: 255 }),
  gateway_payment_id: varchar('gateway_payment_id', { length: 255 }),
  gateway_signature: text('gateway_signature'),
  wallet_transaction_id: integer('wallet_transaction_id'),
  raw_response: jsonb('raw_response').$type<Record<string, unknown> | null>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderPaymentsRelations = relations(
  orderPayments,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [orderPayments.order_id],
      references: [orders.id],
    }),
    refunds: many(orderRefunds),
  }),
);

export type OrderPaymentRow = typeof orderPayments.$inferSelect;
export type NewOrderPaymentRow = typeof orderPayments.$inferInsert;
