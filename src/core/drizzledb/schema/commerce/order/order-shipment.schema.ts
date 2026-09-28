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
import { ShipmentStatus } from '@/internal/commerce/order/enum';
import { orders } from './order.schema';
import { orderItems } from './order-item.schema';

const commerceSchema = pgSchema('commerce');

export const shipmentStatusEnum = pgEnum(
  'order_shipments_status_enum',
  ShipmentStatus,
);

/**
 * Drizzle mirror of `OrderShipment` (`commerce.order_shipments` TypeORM entity).
 * Source: src/internal/commerce/order/entities/order-shipment.entity.ts
 */
export const orderShipments = commerceSchema.table('order_shipments', {
  id: serial('id').primaryKey(),
  shipment_number: varchar('shipment_number', { length: 60 }),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  merchant_id: integer('merchant_id'),
  status: shipmentStatusEnum('status')
    .notNull()
    .default(ShipmentStatus.PENDING),
  subtotal_amount: numeric('subtotal_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  shipping_fee: numeric('shipping_fee', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  courier_partner: varchar('courier_partner', { length: 100 }),
  awb_code: varchar('awb_code', { length: 100 }),
  tracking_url: text('tracking_url'),
  delivery_otp: varchar('delivery_otp', { length: 10 }),
  estimated_delivery_date: timestamp('estimated_delivery_date', {
    withTimezone: true,
  }),
  shipped_at: timestamp('shipped_at', { withTimezone: true }),
  delivered_at: timestamp('delivered_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderShipmentsRelations = relations(
  orderShipments,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [orderShipments.order_id],
      references: [orders.id],
    }),
    items: many(orderItems),
  }),
);

export type OrderShipmentRow = typeof orderShipments.$inferSelect;
export type NewOrderShipmentRow = typeof orderShipments.$inferInsert;
