import { Controller, Get, Post, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
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
        private readonly userRepository: UserRepository,
    ) {}

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Get('my-rewards')
    async getMyRewards(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.getMyRewardsUseCase.execute(userId);
    }

    @Post('apply')
    async applyCoupon(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: { code?: string; couponCode?: string; amount?: number; orderValue?: number; serviceType?: string },
    ) {
        const userId = await this.resolveUserId(user.id);
        const code = body.code || body.couponCode || '';
        const amount = body.amount || body.orderValue || 0;
        return this.applyCouponUseCase.execute(userId, code, amount);
    }
}
