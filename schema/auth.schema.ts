import { pgTable, text, boolean, jsonb } from 'drizzle-orm/pg-core';
import { timestampTz } from './helper';

export type UserMetadata = {
  roles: string[];
  lang?: string;
};

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  metadata: jsonb().$type<UserMetadata>(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestampTz('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestampTz('access_token_expires_at'),
  refreshTokenExpiresAt: timestampTz('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestampTz('expires_at').notNull(),
  createdAt: timestampTz('created_at').defaultNow().notNull(),
  updatedAt: timestampTz('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
