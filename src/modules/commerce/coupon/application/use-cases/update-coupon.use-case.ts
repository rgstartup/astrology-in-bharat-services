import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../../infrastructure/entities/coupon.entity';

@Injectable()
export class UpdateCouponUseCase {
    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepository: Repository<Coupon>,
    ) { }

    async execute(id: string, data: any) {
        const coupon = await this.couponRepository.findOne({ where: { id } });
        if (!coupon) {
            throw new NotFoundException('Coupon not found');
        }

        const updated = Object.assign(coupon, {
            ...data,
            expiry_date: data.expiry_date ? new Date(data.expiry_date) : coupon.expiry_date,
        });

        return this.couponRepository.save(updated);
    }
}
