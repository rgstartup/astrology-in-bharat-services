import { pgSchema, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

const commerceSchema = pgSchema('commerce');

/**
 * Drizzle mirror of `ProductCategory` (`commerce.product_category` TypeORM entity).
 * Source: src/internal/commerce/product/entities/category.entity.ts
 *
 * No relations: the legacy `Product.categories` ManyToMany join table is
 * TypeORM-managed (auto-named) and out of scope until the product read
 * paths migrate.
 */
export const productCategories = commerceSchema.table('product_category', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProductCategoryRow = typeof productCategories.$inferSelect;
export type NewProductCategoryRow = typeof productCategories.$inferInsert;
