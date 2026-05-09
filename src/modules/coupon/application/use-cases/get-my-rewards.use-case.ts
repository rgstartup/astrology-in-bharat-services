import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCoupon } from '../../infrastructure/entities/user-coupon.entity';

@Injectable()
export class GetMyRewardsUseCase {
    constructor(
        @InjectRepository(UserCoupon)
        private readonly userCouponRepo: Repository<UserCoupon>,
    ) { }

    async execute(userId: number) {
        return this.userCouponRepo.find({
            where: { user_id: userId },
            relations: ['coupon'],
            order: { assigned_at: 'DESC' },
        });
    }
}
