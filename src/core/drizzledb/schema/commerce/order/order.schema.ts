import {
  integer,
  json,
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
import { OrderStatus, PaymentStatus } from '@/internal/commerce/order/enum';
import { clientAccounts } from '../../client/client-account.schema';
import { orderItems } from './order-item.schema';
import { orderShipments } from './order-shipment.schema';
import { orderPayments } from './order-payment.schema';
import { orderAddresses } from './order-address.schema';

const commerceSchema = pgSchema('commerce');

export const orderStatusEnum = pgEnum(
  'product_orders_status_enum',
  OrderStatus,
);

export const orderPaymentStatusEnum = pgEnum(
  'product_orders_payment_status_enum',
  PaymentStatus,
);

export interface OrderStatusHistoryEntry {
  status: string;
  updated_by: string;
  updated_at: string;
  role: string;
}

/**
 * Drizzle mirror of `Order` (`commerce.product_orders` TypeORM entity).
 * Source: src/internal/commerce/order/entities/order.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 */
export const orders = commerceSchema.table('product_orders', {
  id: serial('id').primaryKey(),
  order_number: varchar('order_number', { length: 50 }),
  client_id: integer('client_id')
    .notNull()
    .references(() => clientAccounts.id),
  status: orderStatusEnum('status').notNull().default(OrderStatus.PENDING),
  payment_status: orderPaymentStatusEnum('payment_status')
    .notNull()
    .default(PaymentStatus.PENDING),
  subtotal_amount: numeric('subtotal_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  shipping_charge: numeric('shipping_charge', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  platform_fee: numeric('platform_fee', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  payment_method: varchar('payment_method', { length: 100 })
    .notNull()
    .default('razorpay'),
  razorpay_order_id: text('razorpay_order_id'),
  shipping_address: json('shipping_address').$type<Record<
    string,
    unknown
  > | null>(),
  delivery_otp: varchar('delivery_otp', { length: 100 }),
  cancellation_reason: text('cancellation_reason'),
  coupon_code: varchar('coupon_code', { length: 100 }),
  customer_notes: text('customer_notes'),
  status_history: jsonb('status_history')
    .$type<OrderStatusHistoryEntry[]>()
    .notNull()
    .default([]),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clientAccounts, {
    fields: [orders.client_id],
    references: [clientAccounts.id],
  }),
  items: many(orderItems),
  shipments: many(orderShipments),
  payments: many(orderPayments),
  addresses: many(orderAddresses),
}));

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
