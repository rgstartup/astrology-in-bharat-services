import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Coupon,
  CouponStatus,
} from '../../infrastructure/entities/coupon.entity';
import { UserCoupon } from '../../infrastructure/entities/user-coupon.entity';
import { ClientProfileFacade } from '@/modules/client/profile/application/profile.facade';

@Injectable()
export class BulkAssignCouponUseCase {
  private readonly logger = new Logger(BulkAssignCouponUseCase.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    private readonly databaseService: DatabaseService,
    private readonly clientProfileFacade: ClientProfileFacade,
  ) {}

  async execute(couponCode: string, userIds: string[]) {
    const coupon = await this.couponRepo.findOne({
      where: { code: couponCode, is_active: true, status: CouponStatus.ACTIVE },
    });

    if (!coupon) {
      throw new NotFoundException(
        `Active coupon with code "${couponCode}" not found`,
      );
    }

    this.logger.log(
      `Assigning coupon ${couponCode} to ${userIds.length} users bulk.`,
    );

    let assignedCount = 0;

    await this.databaseService.transaction(async (queryRunner) => {
      for (const userId of userIds) {
        const profileClient = await this.clientProfileFacade.getProfile({
          id: userId,
          email: '',
          roles: [],
        });
        if (!profileClient) continue;

        const existing = await queryRunner.manager.findOne(UserCoupon, {
          where: { client_id: profileClient.id, coupon_id: coupon.id },
        });

        if (!existing) {
          const userCoupon = queryRunner.manager.create(UserCoupon, {
            client_id: profileClient.id,
            coupon_id: coupon.id,
            is_used: false,
          });
          await queryRunner.manager.save(UserCoupon, userCoupon);
          assignedCount++;
        }
      }
    });

    return {
      success: true,
      totalMatched: userIds.length,
      assignedCount: assignedCount,
      alreadyAssigned: userIds.length - assignedCount,
    };
  }
}
