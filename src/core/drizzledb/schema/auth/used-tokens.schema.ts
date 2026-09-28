import {
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../users/users.schema';

const authSchema = pgSchema('auth');

/**
 * Drizzle mirror of `UsedTokens` (`auth.used_tokens`).
 * Source: src/internal/auth/entities/used-tokens.entity.ts
 */
export const usedTokens = authSchema.table(
  'used_tokens',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    purpose: varchar('purpose', { length: 50 }),
    used_at: timestamp('used_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.user_id, t.token)],
);

export const usedTokensRelations = relations(usedTokens, ({ one }) => ({
  user: one(users, { fields: [usedTokens.user_id], references: [users.id] }),
}));

export type UsedTokenRow = typeof usedTokens.$inferSelect;
export type NewUsedTokenRow = typeof usedTokens.$inferInsert;
