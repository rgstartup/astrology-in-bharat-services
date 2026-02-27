import { Injectable } from '@nestjs/common';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from './use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from './use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './use-cases/delete-coupon.use-case';

@Injectable()
export class CouponFacade {
    constructor(
        private readonly createCouponUseCase: CreateCouponUseCase,
        private readonly getCouponsUseCase: GetCouponsUseCase,
        private readonly getCouponStatsUseCase: GetCouponStatsUseCase,
        private readonly updateCouponUseCase: UpdateCouponUseCase,
        private readonly deleteCouponUseCase: DeleteCouponUseCase,
    ) { }

    async createCoupon(data: any) {
        return this.createCouponUseCase.execute(data);
    }

    async getCoupons(params?: any) {
        return this.getCouponsUseCase.execute(params);
    }

    async getCouponStats() {
        return this.getCouponStatsUseCase.execute();
    }

    async updateCoupon(id: number, data: any) {
        return this.updateCouponUseCase.execute(id, data);
    }

    async deleteCoupon(id: number) {
        return this.deleteCouponUseCase.execute(id);
    }
}
