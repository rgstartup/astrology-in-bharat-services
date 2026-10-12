import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons, userCoupons } from '@/core/drizzledb/schema';

@Injectable()
export class GetMyRewardsUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(profileId: number | string) {
    const rows = await this.db
      .select({
        id: userCoupons.id,
        client_id: userCoupons.client_id,
        coupon_id: userCoupons.coupon_id,
        is_used: userCoupons.is_used,
        used_at: userCoupons.used_at,
        assigned_at: userCoupons.assigned_at,
        updated_at: userCoupons.updated_at,
        coupon: coupons,
      })
      .from(userCoupons)
      .innerJoin(coupons, eq(userCoupons.coupon_id, coupons.id))
      .where(eq(userCoupons.client_id, Number(profileId)))
      .orderBy(desc(userCoupons.assigned_at));

    return rows;
  }
}
