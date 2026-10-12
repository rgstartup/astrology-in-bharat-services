import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  coupons,
  type CouponRow,
} from '@/core/drizzledb/schema';
import { CouponStatus } from '@/core/enums';

@Injectable()
export class GetCouponsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(params?: Record<string, unknown>) {
    const conditions: SQL[] = [];

    // Note: For 'expired', we check both the status column and the expiry_date
    if (params?.status && params.status !== 'all') {
      if (params.status === 'expired') {
        conditions.push(
          or(
            eq(coupons.status, CouponStatus.EXPIRED),
            and(isNotNull(coupons.expiry_date), lt(coupons.expiry_date, sql`NOW()`)),
          )!,
        );
      } else if (params.status === 'active') {
        conditions.push(
          and(
            eq(coupons.status, CouponStatus.ACTIVE),
            or(isNull(coupons.expiry_date), gt(coupons.expiry_date, sql`NOW()`)),
          )!,
        );
      } else {
        conditions.push(eq(coupons.status, params.status as CouponStatus));
      }
    }

    if (params?.search) {
      const searchPattern = `%${params.search as string}%`;
      conditions.push(
        or(
          ilike(coupons.code, searchPattern),
          ilike(coupons.description, searchPattern),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = (await this.db
      .select()
      .from(coupons)
      .where(whereClause)
      .orderBy(desc(coupons.created_at))) as CouponRow[];

    // Map status to 'expired' on the fly if date is passed
    return results.map((coupon) => {
      if (
        coupon.status !== CouponStatus.EXPIRED &&
        coupon.expiry_date &&
        new Date(coupon.expiry_date) < new Date()
      ) {
        return { ...coupon, status: CouponStatus.EXPIRED };
      }
      return coupon;
    });
  }
}
