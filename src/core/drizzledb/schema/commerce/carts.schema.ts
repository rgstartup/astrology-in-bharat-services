import { integer, pgSchema, serial, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../client/client-account.schema';
import { cartItems } from './cart-items.schema';

const commerceSchema = pgSchema('commerce');

/**
 * Drizzle mirror of `Cart` (`commerce.carts`).
 * `client_id` is OneToOne in TypeORM (unique). Kept unique here.
 */
export const carts = commerceSchema.table('carts', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .unique()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  client: one(clientAccounts, {
    fields: [carts.client_id],
    references: [clientAccounts.id],
  }),
  items: many(cartItems),
}));

export type CartRow = typeof carts.$inferSelect;
export type NewCartRow = typeof carts.$inferInsert;
