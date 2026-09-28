import {
  integer,
  pgSchema,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../users/users.schema';
import { OtpPurposeEnum } from '@/internal/auth/enums/otp-purpose.enum';

const authSchema = pgSchema('auth');

/**
 * Drizzle mirror of `Otp` (`auth.otp` TypeORM entity).
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

export const otpsRelations = relations(otps, ({ one }) => ({
  user: one(users, { fields: [otps.user_id], references: [users.id] }),
}));

export type OtpRow = typeof otps.$inferSelect;
export type NewOtpRow = typeof otps.$inferInsert;
