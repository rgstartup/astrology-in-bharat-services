import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { coupons } from '@/core/drizzledb/schema';
import { CouponStatus, CouponType } from '@/core/enums';
import { ApplyCouponDto } from '../dto/apply-coupon.dto';

@Injectable()
export class ApplyCouponUseCase {
  private readonly logger = new Logger(ApplyCouponUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(dto: ApplyCouponDto) {
    const code = dto.code || dto.couponCode || '';
    const amount = dto.amount || dto.orderValue || 0;

    // 1. Find active coupon (case-insensitive code match)
    const [coupon] = await this.db
      .select()
      .from(coupons)
      .where(
        and(
          sql`LOWER(${coupons.code}) = LOWER(${code})`,
          eq(coupons.is_active, true),
          eq(coupons.status, CouponStatus.ACTIVE),
        ),
      )
      .limit(1);

    if (!coupon) {
      throw new NotFoundException('Coupon not found or inactive');
    }

    // 2. Check expiry
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      this.logger.warn(
        `[COUPON] Coupon ${code} expired on ${String(coupon.expiry_date)}`,
      );
      throw new BadRequestException('This coupon has expired');
    }

    // 3. Check usage limit
    if (
      coupon.max_usage_limit &&
      coupon.usage_count >= coupon.max_usage_limit
    ) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // 4. Check minimum order value
    if (coupon.min_order_value && amount < coupon.min_order_value) {
      this.logger.warn(
        `[COUPON] Coupon ${code} min order value not met. Required: ${coupon.min_order_value}, Current: ${amount}`,
      );
      throw new BadRequestException(
        `Minimum order value of ₹${coupon.min_order_value} is required for this coupon`,
      );
    }

    // 5. Calculate discount
    let discount: number;
    if (coupon.type === CouponType.PERCENTAGE) {
      discount = (amount * coupon.value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.value;
    }

    discount = Math.min(discount, amount);
    discount = Number(discount.toFixed(2));

    return {
      success: true,
      isSuccess: true,
      isValid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.type,
      discount_value: coupon.value,
      discount,
      discountAmount: discount,
      discount_amount: discount,
      final_amount: Number((amount - discount).toFixed(2)),
      message: `Coupon applied! You save ₹${discount}`,
    };
  }
}
