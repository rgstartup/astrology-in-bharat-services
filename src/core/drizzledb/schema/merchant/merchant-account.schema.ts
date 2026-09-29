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
import { MerchantStatus } from '../../../enums/merchant-status.enum';

const merchantSchema = pgSchema('merchant');

export { MerchantStatus };
export const merchantStatusEnum = pgEnum('account_status_enum', MerchantStatus);

/**
 * Drizzle mirror of `MerchantAccount` (`merchant.account` TypeORM entity).
 * Source: src/internal/domains/merchant/account/entities/account.entity.ts
 *
 * Keys are snake_case end-to-end (JS keys match DB columns).
 * `numeric` columns come back as strings from the driver — normalize to
 * number in a co-located mapper at the use-case boundary.
 * Legacy `float` columns map to `doublePrecision` (float8).
 *
 * Notes:
 * - PG enum type name (`account_status_enum`) matches the
 *   TypeORM-generated type; do not rename without a DB migration.
 * - `user_id` is OneToOne in TypeORM (unique, nullable). Kept unique
 *   here with cascade, matching the `clientAccounts.user_id` convention.
 */
export const merchantAccounts = merchantSchema.table('account', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  uid: text('uid').unique(),
  is_blocked: boolean('is_blocked').notNull().default(false),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  avatar: text('avatar'),
  shop_name: text('shop_name'),
  manager_name: text('manager_name'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  pincode: text('pincode'),
  image: text('image'),
  video: text('video'),
  status: merchantStatusEnum('status')
    .notNull()
    .default(MerchantStatus.PENDING_VERIFICATION),
  rating: numeric('rating', { precision: 3, scale: 1 }).notNull().default('0'),
  review_count: integer('review_count').notNull().default(0),
  established: text('established'),
  description: text('description'),
  is_trusted: boolean('is_trusted').notNull().default(false),
  gallery: json('gallery').$type<string[] | null>(),
  features: json('features').$type<string[] | null>(),
  is_online: boolean('is_online').notNull().default(true),
  gstin: text('gstin'),
  pan: text('pan'),
  is_gst_exempt: boolean('is_gst_exempt').notNull().default(false),
  bank_name: text('bank_name'),
  account_holder: text('account_holder'),
  account_number: text('account_number'),
  ifsc: text('ifsc'),
  gst_certificate: text('gst_certificate'),
  pan_front: text('pan_front'),
  pan_back: text('pan_back'),
  aadhar_front: text('aadhar_front'),
  aadhar_back: text('aadhar_back'),
  is_verified: boolean('is_verified').notNull().default(false),
  operational_hours: text('operational_hours').default('10:00 AM - 08:30 PM'),
  trust_score: text('trust_score').default('99.8'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  agent_commission_rate: doublePrecision('agent_commission_rate'),
  bank_accounts: json('bank_accounts').$type<
    Record<string, unknown>[] | null
  >(),
  razorpay_contact_id: text('razorpay_contact_id'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const merchantAccountsRelations = relations(
  merchantAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [merchantAccounts.user_id],
      references: [users.id],
    }),
  }),
);

export type MerchantAccountRow = typeof merchantAccounts.$inferSelect;
export type NewMerchantAccountRow = typeof merchantAccounts.$inferInsert;
