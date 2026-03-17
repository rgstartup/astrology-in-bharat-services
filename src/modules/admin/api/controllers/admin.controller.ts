import { Controller, Get, UseGuards, Query, Param, Patch, Body, Post, ParseIntPipe, Delete } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { AdminFacade } from '../../application/admin.facade';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { CouponFacade } from '@/modules/coupon/application/coupon.facade';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { WithdrawalStatus } from '@/modules/wallet/infrastructure/persistence/entities/withdrawal.entity';

@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminFacade: AdminFacade,
    private readonly usersFacade: UsersFacade,
    private readonly profileFacade: ExpertProfileFacade,
    private readonly chatFacade: ChatFacade,
    private readonly couponFacade: CouponFacade,
  ) { }

  @Get('analytics/user-growth')
  async getUserGrowthStats(@Query('days') days: number = 7) {
    return this.adminFacade.getUserGrowthStats(days);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminFacade.getDashboardStats();
  }

  @Get('experts/stats')
  async getExpertsStats() {
    return this.usersFacade.getExpertStats();
  }

  @Get('users/stats')
  async getUserStats() {
    return this.usersFacade.getUserStats();
  }

  @Get('users')
  async getAllUsers(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersFacade.findAllByRole('client', search, page, limit);
  }

  @Get('experts')
  async getAllExperts(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.usersFacade.findAllByRole('expert', search, page, limit);
  }

  @Get('experts/:id')
  async getExpertDetail(@Param('id') id: number) {
    return this.adminFacade.getExpertDetail(id);
  }

  @Patch('experts/:id/status')
  async updateExpertStatus(
    @Param('id') id: number,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.profileFacade.updateKycStatus(id, body.status, body.reason);
  }

  @Patch('users/:id/block')
  async toggleUserBlock(
    @Param('id') id: number,
    @Body() body: { isBlocked: boolean },
  ) {
    return this.usersFacade.update(id, { is_blocked: body.isBlocked });
  }

  @Get('live-sessions')
  async getLiveSessions(
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminFacade.getLiveSessions(type, page, limit);
  }


  @Get('live-sessions/:id/history')
  async getChatHistory(@Param('id', ParseIntPipe) id: number) {
    return this.chatFacade.getHistory(id);
  }

  @Post('live-sessions/:id/terminate')
  async terminateSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
    @Body() body: { userMessage?: string; expertMessage?: string },
  ) {
    return this.adminFacade.terminateSession(id, admin.id, body.userMessage, body.expertMessage);
  }

  // Coupon Management
  @Get('coupons')
  async getCoupons(@Query() query: any) {
    return this.couponFacade.getCoupons(query);
  }

  @Get('coupons/stats')
  async getCouponStats() {
    return this.couponFacade.getCouponStats();
  }

  @Post('coupons')
  async createCoupon(@Body() data: any) {
    return this.couponFacade.createCoupon(data);
  }

  @Patch('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() data: any) {
    return this.couponFacade.updateCoupon(parseInt(id, 10), data);
  }

  @Delete('coupons/:id')
  async deleteCoupon(@Param('id') id: string) {
    return this.couponFacade.deleteCoupon(parseInt(id, 10));
  }

  // Withdrawal Management
  @Get('withdrawals/pending')
  async getPendingWithdrawals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminFacade.getPendingWithdrawals(page, limit);
  }

  @Get('withdrawals/stats')
  async getWithdrawalStats() {
    return this.adminFacade.getWithdrawalStats();
  }

  @Patch('withdrawals/:id/status')
  async updateWithdrawalStatus(
    @Param('id') id: number,
    @CurrentUser() admin: User,
    @Body() body: { status: WithdrawalStatus; remark?: string },
  ) {
    return this.adminFacade.updateWithdrawalStatus(id, body.status, admin.id, body.remark);
  }
}
