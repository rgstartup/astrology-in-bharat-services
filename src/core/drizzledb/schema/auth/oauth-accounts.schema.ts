import { integer, pgSchema, serial, text, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../users/users.schema';

const authSchema = pgSchema('auth');

/**
 * Drizzle mirror of `OAuthAccount` (`auth.oauth_accounts`).
 * Source: src/internal/auth/entities/oauth-accounts.entity.ts
 */
export const oauthAccounts = authSchema.table('oauth_accounts', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 255 }).notNull(),
  provider_id: varchar('provider_id', { length: 255 }).notNull(),
  email: text('email'),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.user_id],
    references: [users.id],
  }),
}));

export type OAuthAccountRow = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccountRow = typeof oauthAccounts.$inferInsert;
