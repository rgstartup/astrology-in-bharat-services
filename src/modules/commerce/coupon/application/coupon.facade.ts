import { Injectable } from '@nestjs/common';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from './use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from './use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './use-cases/delete-coupon.use-case';
import { MarkCouponAsUsedUseCase } from './use-cases/mark-coupon-as-used.use-case';
import { ApplyCouponUseCase } from './use-cases/apply-coupon.use-case';

@Injectable()
export class CouponFacade {
    constructor(
        private readonly createCouponUseCase: CreateCouponUseCase,
        private readonly getCouponsUseCase: GetCouponsUseCase,
        private readonly getCouponStatsUseCase: GetCouponStatsUseCase,
        private readonly updateCouponUseCase: UpdateCouponUseCase,
        private readonly deleteCouponUseCase: DeleteCouponUseCase,
        private readonly applyCouponUseCase: ApplyCouponUseCase,
        private readonly markCouponAsUsedUseCase: MarkCouponAsUsedUseCase,
    ) { }

    async applyCoupon(userId: number, code: string, amount: number) {
        return this.applyCouponUseCase.execute(userId, code, amount);
    }

    async markCouponAsUsed(userId: number, code: string, manager?: any) {
        return this.markCouponAsUsedUseCase.execute(userId, code, manager);
    }

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
