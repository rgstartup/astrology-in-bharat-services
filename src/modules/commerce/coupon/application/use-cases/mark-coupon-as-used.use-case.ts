import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DataSource } from 'typeorm';
import { Coupon } from '../../infrastructure/entities/coupon.entity';
import { UserCoupon } from '../../infrastructure/entities/user-coupon.entity';

@Injectable()
export class MarkCouponAsUsedUseCase {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepo: Repository<UserCoupon>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(profileId: string, code: string, manager?: EntityManager) {
    const executeLogic = async (mgr: EntityManager) => {
      const repo = mgr.getRepository(Coupon);
      const userCouponRepo = mgr.getRepository(UserCoupon);

      const coupon = await repo
        .createQueryBuilder('coupon')
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
        where: { client_id: profileId, coupon_id: coupon.id },
      });

      if (userCoupon) {
        userCoupon.is_used = true;
        userCoupon.used_at = new Date();
      } else {
        userCoupon = userCouponRepo.create({
          client_id: profileId,
          coupon_id: coupon.id,
          is_used: true,
          used_at: new Date(),
        });
      }

      await userCouponRepo.save(userCoupon);
    };

    if (manager) {
      await executeLogic(manager);
    } else {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await executeLogic(queryRunner.manager);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }
  }
}
