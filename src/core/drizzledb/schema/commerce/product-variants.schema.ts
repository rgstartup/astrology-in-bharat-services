import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products.schema';

const commerceSchema = pgSchema('commerce');

/**
 * Drizzle mirror of `ProductVariant` (`commerce.product_variants`).
 * `bigint` uses `mode: 'number'` (legacy TypeORM returned strings for int8,
 * which is not JSON-safe; numbers serialize cleanly).
 */
export const productVariants = commerceSchema.table('product_variants', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  product_id: bigint('product_id', { mode: 'number' }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  attributes: jsonb('attributes').$type<Record<string, unknown> | null>(),
  description: text('description'),
  is_default: boolean('is_default').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productVariantsRelations = relations(
  productVariants,
  ({ one }) => ({
    product: one(products, {
      fields: [productVariants.product_id],
      references: [products.id],
    }),
  }),
);

export type ProductVariantRow = typeof productVariants.$inferSelect;
