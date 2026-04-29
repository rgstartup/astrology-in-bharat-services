import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponStatus, CouponType } from '../../infrastructure/persistence/entities/coupon.entity';
import { UserCoupon } from '../../infrastructure/persistence/entities/user-coupon.entity';

@Injectable()
export class ApplyCouponUseCase {
    private readonly logger = new Logger(ApplyCouponUseCase.name);

    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepo: Repository<Coupon>,
        @InjectRepository(UserCoupon)
        private readonly userCouponRepo: Repository<UserCoupon>,
    ) { }

    async execute(userId: number, code: string, amount: number) {
        // 1. Find active coupon
        const coupon = await this.couponRepo.createQueryBuilder('coupon')
            .where('LOWER(coupon.code) = LOWER(:code)', { code })
            .andWhere('coupon.is_active = :isActive', { isActive: true })
            .andWhere('coupon.status = :status', { status: CouponStatus.ACTIVE })
            .getOne();

        if (!coupon) {
            throw new NotFoundException('Coupon not found or inactive');
        }

        // 2. Check expiry
        if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
            this.logger.warn(`[COUPON] Coupon ${code} expired on ${coupon.expiry_date}`);
            throw new BadRequestException('This coupon has expired');
        }

        // 3. Check usage limit
        if (coupon.max_usage_limit && coupon.usage_count >= coupon.max_usage_limit) {
            throw new BadRequestException('This coupon has reached its usage limit');
        }

        // 4. Check minimum order value
        if (coupon.min_order_value && amount < coupon.min_order_value) {
            this.logger.warn(`[COUPON] Coupon ${code} min order value not met. Required: ${coupon.min_order_value}, Current: ${amount}`);
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
            coupon_id: coupon.id,
            code: coupon.code,
            discount_type: coupon.type,
            discount_value: coupon.value,
            discount,
            final_amount: Number((amount - discount).toFixed(2)),
            message: `Coupon applied! You save ₹${discount}`,
        };
    }
}
