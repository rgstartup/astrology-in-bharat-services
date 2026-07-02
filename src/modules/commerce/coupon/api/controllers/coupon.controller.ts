import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { GetMyRewardsUseCase } from '../../application/use-cases/get-my-rewards.use-case';
import { ApplyCouponUseCase } from '../../application/use-cases/apply-coupon.use-case';

@Controller({
  path: 'coupons',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CouponController {
  constructor(
    private readonly getMyRewardsUseCase: GetMyRewardsUseCase,
    private readonly applyCouponUseCase: ApplyCouponUseCase,
  ) {}

  @Get('my-rewards')
  async getMyRewards(@CurrentProfile() profileId: string) {
    return this.getMyRewardsUseCase.execute(profileId);
  }

  @Post('apply')
  async applyCoupon(
    @Body()
    body: {
      code?: string;
      couponCode?: string;
      amount?: number;
      orderValue?: number;
      serviceType?: string;
    },
  ) {
    const code = body.code || body.couponCode || '';
    const amount = body.amount || body.orderValue || 0;
    return this.applyCouponUseCase.execute(code, amount);
  }
}
