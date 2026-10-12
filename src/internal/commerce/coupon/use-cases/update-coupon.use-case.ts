import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons } from '@/core/drizzledb/schema';
import { CouponStatus, CouponType } from '@/core/enums';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';

@Injectable()
export class UpdateCouponUseCase {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(id: number | string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.code !== undefined) updateData.code = String(data.code);
    if (data.description !== undefined) {
      updateData.description = data.description ? String(data.description) : null;
    }
    if (data.type !== undefined) updateData.type = data.type as CouponType;
    if (data.value !== undefined) updateData.value = Number(data.value);
    if (data.min_order_value !== undefined) {
      updateData.min_order_value = Number(data.min_order_value);
    }
    if (data.max_discount !== undefined) {
      updateData.max_discount = Number(data.max_discount);
    }
    if (data.expiry_date !== undefined) {
      updateData.expiry_date = data.expiry_date
        ? new Date(data.expiry_date as string | number)
        : null;
    }
    if (data.max_usage_limit !== undefined) {
      updateData.max_usage_limit =
        data.max_usage_limit != null ? Number(data.max_usage_limit) : null;
    }
    if (data.usage_count !== undefined) {
      updateData.usage_count = Number(data.usage_count);
    }
    if (data.status !== undefined) updateData.status = data.status as CouponStatus;
    if (data.is_active !== undefined) updateData.is_active = Boolean(data.is_active);

    const [updated] = await this.db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, Number(id)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Coupon not found');
    }

    return new BooleanMessage();
  }
}
