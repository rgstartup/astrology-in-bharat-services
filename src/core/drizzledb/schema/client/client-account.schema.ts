import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../users/users.schema';
import { UserStatusEnum } from '@/shared/enums/user-status.enum';
import { clientFavorites } from './client-favorites.schema';

const clientSchema = pgSchema('client');

export const userStatusEnum = pgEnum('user_status', UserStatusEnum);

export interface ClientPreferences {
  languages?: string[];
  topics?: number[];
  specializations?: number[];
  professions?: number[];
  communication_channel?: 'chat' | 'call' | 'both';
  receive_daily_panchang?: boolean;
  [key: string]: unknown;
}

/**
 * Drizzle mirror of `ClientAccount` (`client.account` TypeORM entity).
 * Source: src/internal/domains/client/account/entities/account.entity.ts
 */
export const clientAccounts = clientSchema.table('account', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  public_id: varchar('public_id', { length: 12 }).notNull().unique(),
  is_blocked: boolean('is_blocked').notNull().default(false),
  first_name: varchar('first_name', { length: 255 }),
  last_name: varchar('last_name', { length: 255 }),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  /** @deprecated Use `avatar_id` + media relation instead. */
  avatar: text('avatar'),
  avatar_id: integer('avatar_id'),
  username: text('username'),
  date_of_birth: timestamp('date_of_birth', { withTimezone: true }),
  gender: text('gender').notNull().default('other'),
  phone: text('phone'),
  phone_verified_at: timestamp('phone_verified_at', { withTimezone: true }),
  preferences: jsonb('preferences')
    .$type<ClientPreferences | null>()
    .default({}),
  /** @deprecated Use `preferences` instead. */
  language_preference: text('language_preference'),
  time_of_birth: text('time_of_birth'),
  place_of_birth: text('place_of_birth'),
  marital_status: text('marital_status'),
  occupation: text('occupation'),
  about_me: text('about_me'),
  total_spending: numeric('total_spending', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  status: userStatusEnum('status').notNull().default(UserStatusEnum.ACTIVE),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clientAccountsRelations = relations(
  clientAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [clientAccounts.user_id],
      references: [users.id],
    }),
    favorites: many(clientFavorites),
  }),
);

export type ClientAccountRow = typeof clientAccounts.$inferSelect;
export type NewClientAccountRow = typeof clientAccounts.$inferInsert;
