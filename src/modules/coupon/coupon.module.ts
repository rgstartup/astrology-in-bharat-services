import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './infrastructure/persistence/entities/coupon.entity';
import { UserCoupon } from './infrastructure/persistence/entities/user-coupon.entity';
import { CouponFacade } from './application/coupon.facade';
import { CreateCouponUseCase } from './application/use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from './application/use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from './application/use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from './application/use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './application/use-cases/delete-coupon.use-case';

@Module({
    imports: [TypeOrmModule.forFeature([Coupon, UserCoupon])],

    providers: [
        CouponFacade,
        CreateCouponUseCase,
        GetCouponsUseCase,
        GetCouponStatsUseCase,
        UpdateCouponUseCase,
        DeleteCouponUseCase,
    ],
    exports: [CouponFacade],
})
export class CouponModule { }
