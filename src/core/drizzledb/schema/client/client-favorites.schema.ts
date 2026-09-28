import {
  integer,
  pgEnum,
  pgSchema,
  serial,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from './client-account.schema';
import { FavoriteItemType } from '@/internal/domains/client/favorites/enum';

const clientSchema = pgSchema('client');

export const favoriteItemTypeEnum = pgEnum(
  'favorites_item_type_enum',
  FavoriteItemType,
);

/**
 * Drizzle mirror of `Favorites` (`client.favorites` TypeORM entity).
 * Source: src/internal/domains/client/favorites/entities/favorites.entity.ts
 */
export const clientFavorites = clientSchema.table('favorites', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id')
    .notNull()
    .references(() => clientAccounts.id, { onDelete: 'cascade' }),
  item_type: favoriteItemTypeEnum('item_type').notNull(),
  item_id: integer('item_id').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clientFavoritesRelations = relations(
  clientFavorites,
  ({ one }) => ({
    client: one(clientAccounts, {
      fields: [clientFavorites.client_id],
      references: [clientAccounts.id],
    }),
  }),
);

export type ClientFavoriteRow = typeof clientFavorites.$inferSelect;
export type NewClientFavoriteRow = typeof clientFavorites.$inferInsert;
