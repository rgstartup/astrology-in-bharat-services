import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gt, gte, isNull, or, sql, sum } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons } from '@/core/drizzledb/schema';
import { CouponStatus } from '@/core/enums';

@Injectable()
export class GetCouponStatsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      [{ value: totalCoupons }],
      [{ value: activeCouponsCount }],
      [{ value: totalRedemptions }],
      [{ value: usedToday }],
    ] = await Promise.all([
      this.db.select({ value: count() }).from(coupons),
      this.db
        .select({ value: count() })
        .from(coupons)
        .where(
          and(
            eq(coupons.status, CouponStatus.ACTIVE),
            or(isNull(coupons.expiry_date), gt(coupons.expiry_date, sql`NOW()`)),
          ),
        ),
      this.db
        .select({ value: sum(coupons.usage_count) })
        .from(coupons),
      this.db
        .select({ value: sum(coupons.usage_count) })
        .from(coupons)
        .where(gte(coupons.updated_at, today)),
    ]);

    return {
      totalCoupons: Number(totalCoupons || 0),
      activeCoupons: Number(activeCouponsCount || 0),
      totalRedemptions: Number(totalRedemptions || 0),
      usedToday: Number(usedToday || 0),
    };
  }
}
