import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './infrastructure/entities/coupon.entity';
import { UserCoupon } from './infrastructure/entities/user-coupon.entity';
import { CouponFacade } from './application/coupon.facade';
import { CreateCouponUseCase } from './application/use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from './application/use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from './application/use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from './application/use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './application/use-cases/delete-coupon.use-case';
import { GetMyRewardsUseCase } from './application/use-cases/get-my-rewards.use-case';
import { ApplyCouponUseCase } from './application/use-cases/apply-coupon.use-case';
import { MarkCouponAsUsedUseCase } from './application/use-cases/mark-coupon-as-used.use-case';
import { CouponController } from './api/controllers/coupon.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon, UserCoupon])],

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
    ],
    exports: [CouponFacade],
})
export class CouponModule { }

