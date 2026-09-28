import {
  boolean,
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
import { productVariants } from './product-variants.schema';
import { ProductGroup, ProductType } from '@/internal/commerce/product/enum';

const commerceSchema = pgSchema('commerce');

export const productTypeEnum = pgEnum('products_type_enum', ProductType);
export const productGroupEnum = pgEnum(
  'products_product_group_enum',
  ProductGroup,
);

/**
 * Drizzle mirror of `Product` (`commerce.products` TypeORM entity).
 * Source: src/internal/commerce/product/entities/product.entity.ts
 */
export const products = commerceSchema.table('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  type: productTypeEnum('type').notNull().default(ProductType.GOODS),
  product_group: productGroupEnum('product_group')
    .notNull()
    .default(ProductGroup.ITEM),
  merchant_id: integer('merchant_id'),
  stock: integer('stock').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  original_price: numeric('original_price', {
    precision: 10,
    scale: 2,
  }).notNull(),
  is_shipping_chargeable: boolean('is_shipping_chargeable')
    .notNull()
    .default(false),
  shipping_charge: numeric('shipping_charge', {
    precision: 10,
    scale: 2,
  }).notNull(),
  sku: varchar('sku', { length: 255 }),
  image_url: varchar('image_url', { length: 255 }),
  gallery: text('gallery'),
  is_active: boolean('is_active').notNull().default(false),
  short_description: varchar('short_description', { length: 500 }),
  percentage_off: numeric('percentage_off', {
    precision: 5,
    scale: 2,
  }).notNull(),
  category: varchar('category', { length: 255 }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
