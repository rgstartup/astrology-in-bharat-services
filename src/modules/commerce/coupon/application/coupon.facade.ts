import { Injectable } from '@nestjs/common';
import { CreateCouponUseCase } from './use-cases/create-coupon.use-case';
import { GetCouponsUseCase } from './use-cases/get-coupons.use-case';
import { GetCouponStatsUseCase } from './use-cases/get-coupon-stats.use-case';
import { UpdateCouponUseCase } from './use-cases/update-coupon.use-case';
import { DeleteCouponUseCase } from './use-cases/delete-coupon.use-case';
import { MarkCouponAsUsedUseCase } from './use-cases/mark-coupon-as-used.use-case';
import { ApplyCouponUseCase } from './use-cases/apply-coupon.use-case';
import { BulkAssignCouponUseCase } from './use-cases/bulk-assign-coupon.use-case';

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
    private readonly bulkAssignCouponUseCase: BulkAssignCouponUseCase,
  ) {}

  async applyCoupon(code: string, amount: number) {
    return this.applyCouponUseCase.execute(code, amount);
  }

  async markCouponAsUsed(profileId: string, code: string, manager?: unknown) {
    return this.markCouponAsUsedUseCase.execute(
      profileId,
      code,
      manager as import('typeorm').EntityManager,
    );
  }

  async createCoupon(data: Record<string, unknown>) {
    return this.createCouponUseCase.execute(data);
  }

  async getCoupons(params?: Record<string, unknown>) {
    return this.getCouponsUseCase.execute(params);
  }

  async getCouponStats() {
    return this.getCouponStatsUseCase.execute();
  }

  async updateCoupon(id: string, data: Record<string, unknown>) {
    return this.updateCouponUseCase.execute(id, data);
  }

  async deleteCoupon(id: string) {
    return this.deleteCouponUseCase.execute(id);
  }

  async bulkAssign(couponCode: string, userIds: string[]) {
    return this.bulkAssignCouponUseCase.execute(couponCode, userIds);
  }
}
