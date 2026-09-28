import {
  boolean,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { users } from './users.schema';

import { OtpPurposeEnum } from '@/internal/auth/entities/otp.entity';

export const authSchema = pgSchema('auth');

export const sessionTypeEnumValues = [
  'refresh_token',
  'api_key',
  'device_session',
] as const;
export type SessionType = (typeof sessionTypeEnumValues)[number];

/**
 * Drizzle mirror of `Session` (`auth.sessions` TypeORM entity).
 * Source: src/internal/auth/entities/session.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 *
 * - PK was a custom uuidv7 decorator; Drizzle generates it via $defaultFn.
 * - `type` is a plain varchar in Postgres (not a native enum), kept as text
 *   here to avoid a DB migration.
 */
export const sessions = authSchema.table('sessions', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  secret_hash: text('secret_hash').notNull(),
  type: text('type').notNull().default('refresh_token').$type<SessionType>(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
  ip_address: varchar('ip_address', { length: 100 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

/**
 * Drizzle mirror of `UsedTokens` (`auth.used_tokens`).
 * Source: src/internal/auth/entities/used-tokens.entity.ts
 *
 * IMPORTANT: TypeORM hashed `token` with sha256 in `@BeforeInsert()`.
 * Drizzle has no hooks — hash in the application layer before insert
 * to keep values comparable.
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

/**
 * Drizzle mirror of `Otp` (`auth.otp`).
 * Source: src/internal/auth/entities/otp.entity.ts
 */
export const otps = authSchema.table(
  'otp',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    email: varchar('email', { length: 255 }).notNull(),
    otp: varchar('otp', { length: 255 }).notNull(),
    purpose: varchar('purpose', { length: 50 })
      .notNull()
      .default(OtpPurposeEnum.REGISTRATION)
      .$type<OtpPurposeEnum>(),
    attempts: integer('attempts').notNull().default(0),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('otp_email_idx').on(t.email)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.user_id], references: [users.id] }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.user_id],
    references: [users.id],
  }),
}));

export const usedTokensRelations = relations(usedTokens, ({ one }) => ({
  user: one(users, { fields: [usedTokens.user_id], references: [users.id] }),
}));

export const otpsRelations = relations(otps, ({ one }) => ({
  user: one(users, { fields: [otps.user_id], references: [users.id] }),
}));

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type OAuthAccountRow = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccountRow = typeof oauthAccounts.$inferInsert;
export type UsedTokenRow = typeof usedTokens.$inferSelect;
export type NewUsedTokenRow = typeof usedTokens.$inferInsert;
export type OtpRow = typeof otps.$inferSelect;
export type NewOtpRow = typeof otps.$inferInsert;
