import {
  bigint,
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
import { OrderItemStatus } from '../../../../../internal/commerce/order/enum';
import { orders } from './order.schema';
import { orderShipments } from './order-shipment.schema';
import { products } from '../product/products.schema';
import { productVariants } from '../product/product-variants.schema';

const commerceSchema = pgSchema('commerce');

export const orderItemStatusEnum = pgEnum(
  'order_items_status_enum',
  OrderItemStatus,
);

/**
 * Drizzle mirror of `OrderItem` (`commerce.order_items` TypeORM entity).
 * Source: src/internal/commerce/order/entities/order-item.entity.ts
 *
 * `variant_id` is `bigint` (matches `product_variants.id`); all other FKs
 * are `integer`. `numeric` columns normalize to number at the boundary.
 */
export const orderItems = commerceSchema.table('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  shipment_id: integer('shipment_id').references(() => orderShipments.id, {
    onDelete: 'set null',
  }),
  product_id: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  variant_id: bigint('variant_id', { mode: 'number' }).references(
    () => productVariants.id,
    { onDelete: 'set null' },
  ),
  merchant_id: integer('merchant_id'),
  product_name: varchar('product_name', { length: 255 }),
  variant_name: varchar('variant_name', { length: 150 }),
  sku: varchar('sku', { length: 100 }),
  thumbnail_url: text('thumbnail_url'),
  variant_attributes: jsonb('variant_attributes').$type<Record<
    string,
    unknown
  > | null>(),
  quantity: integer('quantity').notNull().default(1),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  unit_mrp: numeric('unit_mrp', { precision: 10, scale: 2 }),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  status: orderItemStatusEnum('status')
    .notNull()
    .default(OrderItemStatus.PENDING),
  delivery_otp: varchar('delivery_otp', { length: 100 }),
  cancellation_reason: text('cancellation_reason'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  shipment: one(orderShipments, {
    fields: [orderItems.shipment_id],
    references: [orderShipments.id],
  }),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variant_id],
    references: [productVariants.id],
  }),
}));

export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;
