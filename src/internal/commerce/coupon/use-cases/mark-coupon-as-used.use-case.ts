import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons, userCoupons } from '@/core/drizzledb/schema';

@Injectable()
export class MarkCouponAsUsedUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    profileId: number | string,
    code: string,
    tx?: unknown,
  ) {
    const executor = (tx as DrizzleDb) || this.db;

    const [coupon] = await executor
      .select()
      .from(coupons)
      .where(
        and(
          sql`LOWER(${coupons.code}) = LOWER(${code})`,
          eq(coupons.is_active, true),
        ),
      )
      .limit(1);

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Increment usage count
    await executor
      .update(coupons)
      .set({
        usage_count: sql`${coupons.usage_count} + 1`,
        updated_at: new Date(),
      })
      .where(eq(coupons.id, coupon.id));

    // Record user usage with upsert
    const now = new Date();
    await executor
      .insert(userCoupons)
      .values({
        client_id: Number(profileId),
        coupon_id: coupon.id,
        is_used: true,
        used_at: now,
        assigned_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [userCoupons.client_id, userCoupons.coupon_id],
        set: {
          is_used: true,
          used_at: now,
          updated_at: now,
        },
      });

    return {
      success: true,
      message: 'Coupon applied and marked as used',
    };
  }
}
