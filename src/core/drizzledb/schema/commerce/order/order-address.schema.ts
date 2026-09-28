import {
  integer,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { AddressType } from '@/shared/enums/address-type.enum';
import { orders } from './order.schema';

const commerceSchema = pgSchema('commerce');

export const orderAddressTypeEnum = pgEnum(
  'order_addresses_address_type_enum',
  AddressType,
);

/**
 * Drizzle mirror of `OrderAddress` (`commerce.order_addresses` TypeORM entity).
 * Source: src/internal/commerce/order/entities/order-address.entity.ts
 *
 * Snapshot of the shipping/billing address at order time — no FK to the
 * shared address book. PG enum type is table-scoped
 * (`order_addresses_address_type_enum`), mirroring TypeORM's per-column type.
 */
export const orderAddresses = commerceSchema.table('order_addresses', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  address_type: orderAddressTypeEnum('address_type')
    .notNull()
    .default(AddressType.SHIPPING),
  full_name: varchar('full_name', { length: 150 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  alternate_phone: varchar('alternate_phone', { length: 20 }),
  address_line_1: varchar('address_line_1', { length: 255 }).notNull(),
  address_line_2: varchar('address_line_2', { length: 255 }),
  landmark: varchar('landmark', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postal_code: varchar('postal_code', { length: 20 }).notNull(),
  country: varchar('country', { length: 100 }).notNull().default('India'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderAddressesRelations = relations(orderAddresses, ({ one }) => ({
  order: one(orders, {
    fields: [orderAddresses.order_id],
    references: [orders.id],
  }),
}));

export type OrderAddressRow = typeof orderAddresses.$inferSelect;
export type NewOrderAddressRow = typeof orderAddresses.$inferInsert;
