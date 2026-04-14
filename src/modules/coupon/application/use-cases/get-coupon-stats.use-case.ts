import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Coupon, CouponStatus } from '../../infrastructure/persistence/entities/coupon.entity';

@Injectable()
export class GetCouponStatsUseCase {
    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepository: Repository<Coupon>,
    ) { }

    async execute() {
        const now = new Date();
        const [totalCoupons, activeCouponsCount, totalRedemptions] = await Promise.all([
            this.couponRepository.count(),
            this.couponRepository.createQueryBuilder('coupon')
                .where('coupon.status = :status', { status: CouponStatus.ACTIVE })
                .andWhere('(coupon.expiry_date IS NULL OR coupon.expiry_date > :now)', { now })
                .getCount(),
            this.couponRepository.sum('usage_count'),
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // This is a bit simplified, usually you'd track redemptions in a separate table
        // For now, let's just return a placeholder or sum usage of coupons updated today
        const usedToday = await this.couponRepository
            .createQueryBuilder('coupon')
            .where('coupon.updated_at >= :today', { today })
            .select('SUM(coupon.usage_count)', 'sum')
            .getRawOne();

        return {
            totalCoupons,
            activeCoupons: activeCouponsCount,
            totalRedemptions: totalRedemptions || 0,
            usedToday: parseInt(usedToday?.sum || '0', 10),
        };
    }
}
