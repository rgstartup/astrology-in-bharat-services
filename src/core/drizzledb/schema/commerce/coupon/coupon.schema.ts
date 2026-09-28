import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { CouponStatus, CouponType } from '@/internal/commerce/coupon/enum';
import { userCoupons } from './user-coupon.schema';

const commerceSchema = pgSchema('commerce');

export const couponTypeEnum = pgEnum('coupons_type_enum', CouponType);

export const couponStatusEnum = pgEnum('coupons_status_enum', CouponStatus);

/**
 * Drizzle mirror of `Coupon` (`commerce.coupons` TypeORM entity).
 * Source: src/internal/commerce/coupon/entities/coupon.entity.ts
 *
 * Legacy `float` columns map to `doublePrecision` (float8).
 */
export const coupons = commerceSchema.table('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description'),
  type: couponTypeEnum('type').notNull().default(CouponType.PERCENTAGE),
  value: doublePrecision('value').notNull(),
  min_order_value: doublePrecision('min_order_value').notNull().default(0),
  max_discount: doublePrecision('max_discount').notNull().default(0),
  expiry_date: timestamp('expiry_date', { withTimezone: true }),
  max_usage_limit: integer('max_usage_limit'),
  usage_count: integer('usage_count').notNull().default(0),
  status: couponStatusEnum('status').notNull().default(CouponStatus.ACTIVE),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  user_coupons: many(userCoupons),
}));

export type CouponRow = typeof coupons.$inferSelect;
export type NewCouponRow = typeof coupons.$inferInsert;
