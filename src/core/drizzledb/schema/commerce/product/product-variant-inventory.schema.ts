import {
  bigint,
  integer,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { productVariants } from './product-variants.schema';

const commerceSchema = pgSchema('commerce');

/**
 * Drizzle mirror of `ProductInventory`
 * (`commerce.product_variant_inventory` TypeORM entity).
 * Source: src/internal/commerce/product/entities/inventory.entity.ts
 *
 * One row per variant (legacy OneToOne) — `variant_id` kept unique.
 * `available_stock` (stock - reserved_stock, floored at 0) is a computed
 * getter in the legacy entity; compute it in the mapper, not the schema.
 */
export const productVariantInventory = commerceSchema.table(
  'product_variant_inventory',
  {
    id: serial('id').primaryKey(),
    variant_id: bigint('variant_id', { mode: 'number' })
      .notNull()
      .unique()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    stock: integer('stock').notNull().default(0),
    reserved_stock: integer('reserved_stock').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const productVariantInventoryRelations = relations(
  productVariantInventory,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantInventory.variant_id],
      references: [productVariants.id],
    }),
  }),
);

export type ProductVariantInventoryRow =
  typeof productVariantInventory.$inferSelect;
export type NewProductVariantInventoryRow =
  typeof productVariantInventory.$inferInsert;
