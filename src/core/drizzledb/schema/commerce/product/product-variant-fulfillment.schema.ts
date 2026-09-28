import {
  bigint,
  boolean,
  integer,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  DeliveryType,
  FulfillmentType,
} from '@/internal/commerce/product/enum';
import { productVariants } from './product-variants.schema';

const commerceSchema = pgSchema('commerce');

export const fulfillmentTypeEnum = pgEnum(
  'product_variant_fulfillment_fulfillment_type_enum',
  FulfillmentType,
);

export const deliveryTypeEnum = pgEnum(
  'product_variant_fulfillment_delivery_type_enum',
  DeliveryType,
);

/**
 * Drizzle mirror of `ProductFulFillment`
 * (`commerce.product_variant_fulfillment` TypeORM entity).
 * Source: src/internal/commerce/product/entities/fulfillment.entity.ts
 *
 * One row per variant (legacy OneToOne) — `variant_id` kept unique.
 */
export const productVariantFulfillment = commerceSchema.table(
  'product_variant_fulfillment',
  {
    id: serial('id').primaryKey(),
    variant_id: bigint('variant_id', { mode: 'number' })
      .notNull()
      .unique()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    fulfillment_type: fulfillmentTypeEnum('fulfillment_type').notNull(),
    delivery_type: deliveryTypeEnum('delivery_type').notNull(),
    shipping_fee: numeric('shipping_fee', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    processing_time: integer('processing_time').notNull().default(0),
    estimated_delivery_min: integer('estimated_delivery_min')
      .notNull()
      .default(0),
    estimated_delivery_max: integer('estimated_delivery_max')
      .notNull()
      .default(0),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const productVariantFulfillmentRelations = relations(
  productVariantFulfillment,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantFulfillment.variant_id],
      references: [productVariants.id],
    }),
  }),
);

export type ProductVariantFulfillmentRow =
  typeof productVariantFulfillment.$inferSelect;
export type NewProductVariantFulfillmentRow =
  typeof productVariantFulfillment.$inferInsert;
