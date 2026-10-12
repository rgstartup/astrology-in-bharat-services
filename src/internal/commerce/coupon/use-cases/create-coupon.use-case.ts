import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons } from '@/core/drizzledb/schema';
import { CouponStatus, CouponType } from '@/core/enums';

@Injectable()
export class CreateCouponUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(data: Record<string, unknown>) {
    const [existing] = await this.db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, String(data.code)))
      .limit(1);

    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const [created] = await this.db
      .insert(coupons)
      .values({
        code: String(data.code),
        description: data.description ? String(data.description) : null,
        type: (data.type as CouponType) || CouponType.PERCENTAGE,
        value: Number(data.value),
        min_order_value: Number(data.min_order_value ?? 0),
        max_discount: Number(data.max_discount ?? 0),
        expiry_date: data.expiry_date
          ? new Date(data.expiry_date as string | number)
          : null,
        max_usage_limit:
          data.max_usage_limit != null ? Number(data.max_usage_limit) : null,
        usage_count: Number(data.usage_count ?? 0),
        status: (data.status as CouponStatus) || CouponStatus.ACTIVE,
        is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      })
      .returning();

    return created;
  }
}
