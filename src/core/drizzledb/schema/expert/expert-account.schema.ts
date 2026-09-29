import {
  boolean,
  doublePrecision,
  integer,
  json,
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
import { ExpertKycStatus } from '../../../../internal/domains/expert/shared/enums/kyc-status.enum';

const expertSchema = pgSchema('expert');

export const expertKycStatusEnum = pgEnum(
  'account_kyc_status_enum',
  ExpertKycStatus,
);

/**
 * Drizzle mirror of `ExpertAccount` (`expert.account` TypeORM entity).
 * Source: src/internal/domains/expert/account/entities/account.entity.ts
 */
export const expertAccounts = expertSchema.table('account', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  uid: text('uid').unique(),
  is_blocked: boolean('is_blocked').notNull().default(false),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  avatar: text('avatar'),
  phone: text('phone'),
  gender: text('gender').notNull().default('other'),
  date_of_birth: timestamp('date_of_birth', { withTimezone: true }),
  specialization: text('specialization'),
  bio: text('bio'),
  about: text('about'),
  languages: text('languages'),
  experience_in_years: integer('experience_in_years').notNull().default(0),
  total_likes: integer('total_likes').notNull().default(0),
  total_reviews: integer('total_reviews').notNull().default(0),
  rating: doublePrecision('rating').notNull().default(0),
  kyc_status: expertKycStatusEnum('kyc_status')
    .notNull()
    .default(ExpertKycStatus.PENDING),
  rejection_reason: text('rejection_reason'),
  consultation_count: integer('consultation_count').notNull().default(0),
  phone_number: text('phone_number'),
  price: doublePrecision('price'),
  chat_price: doublePrecision('chat_price'),
  call_price: doublePrecision('call_price'),
  video_call_price: doublePrecision('video_call_price'),
  report_price: doublePrecision('report_price'),
  horoscope_price: doublePrecision('horoscope_price'),
  custom_services: json('custom_services').$type<
    Record<string, unknown>[] | null
  >(),
  bank_details: text('bank_details'),
  documents: json('documents').$type<Record<string, unknown>[] | null>(),
  gallery: text('gallery'),
  videos: text('videos'),
  certificates: text('certificates'),
  video: text('video'),
  detailed_experience: json('detailed_experience').$type<
    Record<string, unknown>[] | null
  >(),
  is_available: boolean('is_available').notNull().default(false),
  about_me: text('about_me'),
  total_earning: numeric('total_earning', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  razorpay_contact_id: text('razorpay_contact_id'),
  agent_commission_rate: doublePrecision('agent_commission_rate'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const expertAccountsRelations = relations(expertAccounts, ({ one }) => ({
  user: one(users, {
    fields: [expertAccounts.user_id],
    references: [users.id],
  }),
}));

export type ExpertAccountRow = typeof expertAccounts.$inferSelect;
export type NewExpertAccountRow = typeof expertAccounts.$inferInsert;
