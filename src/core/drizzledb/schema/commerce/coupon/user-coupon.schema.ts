import {
  boolean,
  integer,
  pgSchema,
  serial,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clientAccounts } from '../../client/client-account.schema';
import { coupons } from './coupon.schema';

const commerceSchema = pgSchema('commerce');

/**
 * Drizzle mirror of `UserCoupon` (`commerce.user_coupons` TypeORM entity).
 * Source: src/internal/commerce/coupon/entities/user-coupon.entity.ts
 */
export const userCoupons = commerceSchema.table(
  'user_coupons',
  {
    id: serial('id').primaryKey(),
    client_id: integer('client_id')
      .notNull()
      .references(() => clientAccounts.id),
    coupon_id: integer('coupon_id')
      .notNull()
      .references(() => coupons.id),
    is_used: boolean('is_used').notNull().default(false),
    used_at: timestamp('used_at', { withTimezone: true }),
    assigned_at: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('user_coupons_client_coupon_unique').on(t.client_id, t.coupon_id),
  ],
);

export const userCouponsRelations = relations(userCoupons, ({ one }) => ({
  client: one(clientAccounts, {
    fields: [userCoupons.client_id],
    references: [clientAccounts.id],
  }),
  coupon: one(coupons, {
    fields: [userCoupons.coupon_id],
    references: [coupons.id],
  }),
}));

export type UserCouponRow = typeof userCoupons.$inferSelect;
export type NewUserCouponRow = typeof userCoupons.$inferInsert;
