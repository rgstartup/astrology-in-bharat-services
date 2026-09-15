import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { CouponFacade } from './coupon.facade';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from './use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from './use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './use-cases/delete-coupon.use-case';
import { GetMyRewardsUseCase } from './use-cases/get-my-rewards.use-case';
import { ApplyCouponUseCase } from './use-cases/apply-coupon.use-case';
import { MarkCouponAsUsedUseCase } from './use-cases/mark-coupon-as-used.use-case';
import { BulkAssignCouponUseCase } from './use-cases/bulk-assign-coupon.use-case';
import { CouponController } from './controllers/coupon.controller';

import { AccountModule } from '@/modules/client/account/account.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, UserCoupon]),
    AccountModule,
  ],

  controllers: [CouponController],

  providers: [
    CouponFacade,
    CreateCouponUseCase,
    GetCouponsUseCase,
    GetCouponStatsUseCase,
    UpdateCouponUseCase,
    DeleteCouponUseCase,
    GetMyRewardsUseCase,
    ApplyCouponUseCase,
    MarkCouponAsUsedUseCase,
    BulkAssignCouponUseCase,
  ],
  exports: [CouponFacade],
})
export class CouponModule {}
