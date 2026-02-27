import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponStatus } from '../../infrastructure/persistence/entities/coupon.entity';

@Injectable()
export class GetCouponsUseCase {
    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepository: Repository<Coupon>,
    ) { }

    async execute(params?: any) {
        const query = this.couponRepository.createQueryBuilder('coupon');

        if (params?.status && params.status !== 'all') {
            query.andWhere('coupon.status = :status', { status: params.status });
        }

        if (params?.search) {
            query.andWhere('(coupon.code ILIKE :search OR coupon.description ILIKE :search)', {
                search: `%${params.search}%`,
            });
        }

        query.orderBy('coupon.created_at', 'DESC');

        return query.getMany();
    }
}
