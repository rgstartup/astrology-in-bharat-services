import {
  integer,
  pgSchema,
  serial,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import { products } from '../product/products.schema';

const commerceSchema = pgSchema('commerce');

/**
 * Drizzle mirror of `Wishlist` (`commerce.wishlists` TypeORM entity).
 * Source: src/internal/commerce/wishlist/entities/wishlist.entity.ts
 *
 * Notes:
 * - The legacy entity declares `product`/`puja`/`merchant` relations without
 *   explicit FK columns (TypeORM auto-names them). The mirror uses explicit
 *   snake_case columns (`product_id`, `puja_id`, `merchant_id`) per the
 *   STRICT snake_case rule; reconcile against the live DB before generating
 *   migrations for this table.
 * - `expert_id`, `puja_id`, `merchant_id` intentionally have NO FK yet
 *   (those profiles are not migrated to Drizzle).
 */
export const wishlists = commerceSchema.table(
  'wishlists',
  {
    id: serial('id').primaryKey(),
    client_id: integer('client_id')
      .notNull()
      .references(() => clientAccounts.id, { onDelete: 'cascade' }),
    expert_id: integer('expert_id'),
    product_id: integer('product_id').references(() => products.id, {
      onDelete: 'cascade',
    }),
    puja_id: integer('puja_id'),
    merchant_id: integer('merchant_id'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('wishlists_client_product_unique').on(t.client_id, t.product_id),
    unique('wishlists_client_expert_unique').on(t.client_id, t.expert_id),
    unique('wishlists_client_puja_unique').on(t.client_id, t.puja_id),
    unique('wishlists_client_merchant_unique').on(t.client_id, t.merchant_id),
  ],
);

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  client: one(clientAccounts, {
    fields: [wishlists.client_id],
    references: [clientAccounts.id],
  }),
  product: one(products, {
    fields: [wishlists.product_id],
    references: [products.id],
  }),
}));

export type WishlistRow = typeof wishlists.$inferSelect;
export type NewWishlistRow = typeof wishlists.$inferInsert;
