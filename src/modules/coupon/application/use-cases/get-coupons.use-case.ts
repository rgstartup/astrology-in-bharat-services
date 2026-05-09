import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponStatus } from '../../infrastructure/entities/coupon.entity';

@Injectable()
export class GetCouponsUseCase {
    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepository: Repository<Coupon>,
    ) { }

    async execute(params?: any) {
        const query = this.couponRepository.createQueryBuilder('coupon');

        // Note: For 'expired', we check both the status column and the expiry_date
        if (params?.status && params.status !== 'all') {
            if (params.status === 'expired') {
                query.andWhere('(coupon.status = :expiredStatus OR (coupon.expiry_date IS NOT NULL AND coupon.expiry_date < :now))', {
                    expiredStatus: CouponStatus.EXPIRED,
                    now: new Date(),
                });
            } else if (params.status === 'active') {
                query.andWhere('coupon.status = :activeStatus', { activeStatus: CouponStatus.ACTIVE });
                query.andWhere('(coupon.expiry_date IS NULL OR coupon.expiry_date > :now)', {
                    now: new Date(),
                });
            } else {
                query.andWhere('coupon.status = :status', { status: params.status });
            }
        }

        if (params?.search) {
            query.andWhere('(coupon.code ILIKE :search OR coupon.description ILIKE :search)', {
                search: `%${params.search}%`,
            });
        }

        query.orderBy('coupon.created_at', 'DESC');

        const coupons = await query.getMany();

        // Map status to 'expired' on the fly if date is passed
        return coupons.map(coupon => {
            if (coupon.status !== CouponStatus.EXPIRED && coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
                return { ...coupon, status: CouponStatus.EXPIRED };
            }
            return coupon;
        });
    }
}
