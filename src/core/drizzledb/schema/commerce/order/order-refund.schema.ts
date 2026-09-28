import {
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  RefundDestination,
  RefundStatus,
} from '@/internal/commerce/order/enum';
import { orders } from './order.schema';
import { orderPayments } from './order-payment.schema';

const commerceSchema = pgSchema('commerce');

export const refundDestinationEnum = pgEnum(
  'order_refunds_destination_enum',
  RefundDestination,
);

export const refundStatusEnum = pgEnum(
  'order_refunds_status_enum',
  RefundStatus,
);

/**
 * Drizzle mirror of `OrderRefund` (`commerce.order_refunds` TypeORM entity).
 * Source: src/internal/commerce/order/entities/order-refund.entity.ts
 */
export const orderRefunds = commerceSchema.table('order_refunds', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  payment_id: integer('payment_id').references(() => orderPayments.id, {
    onDelete: 'set null',
  }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  refund_reason: text('refund_reason').notNull(),
  destination: refundDestinationEnum('destination')
    .notNull()
    .default(RefundDestination.SOURCE),
  gateway_refund_id: varchar('gateway_refund_id', { length: 255 }),
  status: refundStatusEnum('status').notNull().default(RefundStatus.PENDING),
  processed_by: integer('processed_by'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderRefundsRelations = relations(orderRefunds, ({ one }) => ({
  order: one(orders, {
    fields: [orderRefunds.order_id],
    references: [orders.id],
  }),
  payment: one(orderPayments, {
    fields: [orderRefunds.payment_id],
    references: [orderPayments.id],
  }),
}));

export type OrderRefundRow = typeof orderRefunds.$inferSelect;
export type NewOrderRefundRow = typeof orderRefunds.$inferInsert;
