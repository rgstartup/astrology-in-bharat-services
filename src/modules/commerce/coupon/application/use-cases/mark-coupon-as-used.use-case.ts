// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Coupon } from '../../infrastructure/entities/coupon.entity';
import { UserCoupon } from '../../infrastructure/entities/user-coupon.entity';

@Injectable()
export class MarkCouponAsUsedUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepo: Repository<UserCoupon>,
  ) {}

  async execute(userId: string, code: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Coupon) : this.couponRepo;
    const userCouponRepo = manager ? manager.getRepository(UserCoupon) : this.userCouponRepo;

    const coupon = await repo.createQueryBuilder('coupon')
      .where('LOWER(coupon.code) = LOWER(:code)', { code })
      .andWhere('coupon.is_active = :isActive', { isActive: true })
      .getOne();
    
      if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Increment usage count
    coupon.usage_count += 1;
    await repo.save(coupon);

    // Record user usage
    let userCoupon = await userCouponRepo.findOne({
      where: { client_id: userId, coupon_id: coupon.id },
    });

    if (userCoupon) {
      userCoupon.is_used = true;
      userCoupon.used_at = new Date();
    } else {
      userCoupon = userCouponRepo.create({
        client_id: userId,
        coupon_id: coupon.id,
        is_used: true,
        used_at: new Date(),
      });
    }

    await userCouponRepo.save(userCoupon);
  }
}
