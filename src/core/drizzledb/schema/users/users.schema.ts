import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { AdminPermission, PlatformEnum, RoleEnum } from '@/core/enums';

export const roleEnum = pgEnum('role', RoleEnum);

export const platformEnum = pgEnum('platform', PlatformEnum);

export const adminPermissionEnum = pgEnum('admin_permission', AdminPermission);

/**
 * Drizzle mirror of `User` (`public.users` TypeORM entity).
 * Source: src/internal/users/entities/user.entity.ts
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    user_group_id: uuid('user_group_id'),
    email: varchar('email', { length: 255 }).notNull(),
    password: text('password'),
    email_verified_at: timestamp('email_verified_at', {
      withTimezone: true,
    }),
    first_name: varchar('first_name', { length: 255 }),
    last_name: varchar('last_name', { length: 255 }),
    name: varchar('name', { length: 255 }),
    full_name: varchar('full_name', { length: 255 }),
    /** @deprecated Use `avatar_id` + media relation instead. */
    avatar: text('avatar'),
    avatar_id: integer('avatar_id'),
    is_blocked: boolean('is_blocked').notNull().default(false),
    blocked_by_id: integer('blocked_by_id'),
    blocked_by_name: varchar('blocked_by_name', { length: 255 }),
    blocked_at: timestamp('blocked_at', { withTimezone: true }),
    role: roleEnum('role').notNull().default(RoleEnum.CLIENT),
    platform: platformEnum('platform').notNull().default(PlatformEnum.CLIENT),
    admin_permissions: adminPermissionEnum('admin_permissions').array(),
    referred_by_id: integer('referred_by_id'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('USER_PLATFORM_UNIQ').on(t.email, t.platform)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  referredBy: one(users, {
    fields: [users.referred_by_id],
    references: [users.id],
    relationName: 'user_referrals',
  }),
  referrals: many(users, { relationName: 'user_referrals' }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
