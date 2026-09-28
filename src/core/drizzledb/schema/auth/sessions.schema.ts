import {
  boolean,
  integer,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { users } from '../users/users.schema';

const authSchema = pgSchema('auth');

export const sessionTypeEnumValues = [
  'refresh_token',
  'api_key',
  'device_session',
] as const;
export type SessionType = (typeof sessionTypeEnumValues)[number];

/**
 * Drizzle mirror of `Session` (`auth.sessions` TypeORM entity).
 * Source: src/internal/auth/entities/session.entity.ts
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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.user_id], references: [users.id] }),
}));

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
