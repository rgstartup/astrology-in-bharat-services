import {
  bigint,
  integer,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { carts } from './carts.schema';
import { products } from './products.schema';
import { productVariants } from './product-variants.schema';

const commerceSchema = pgSchema('commerce');

/** Drizzle mirror of `CartItem` (`commerce.cart_items`). */
export const cartItems = commerceSchema.table('cart_items', {
  id: serial('id').primaryKey(),
  cart_id: integer('cart_id').references(() => carts.id, {
    onDelete: 'cascade',
  }),
  product_id: integer('product_id').references(() => products.id, {
    onDelete: 'cascade',
  }),
  variant_id: bigint('variant_id', { mode: 'number' }),
  quantity: integer('quantity').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cart_id],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.product_id],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variant_id],
    references: [productVariants.id],
  }),
}));

export type CartItemRow = typeof cartItems.$inferSelect;
export type NewCartItemRow = typeof cartItems.$inferInsert;
