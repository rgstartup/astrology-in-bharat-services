import { Controller, Get, Query, Post, Body, UseGuards, Patch, Param, ParseIntPipe, UseInterceptors, UploadedFiles, Delete } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { AdminFacade } from '../../application/admin.facade';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { WithdrawalStatus } from '@/modules/wallet/infrastructure/entities/withdrawal.entity';
import { FilterCriteria } from '../../application/use-cases/get-filtered-users.use-case';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { ReviewsFacade } from '@/modules/consultation/reviews/application/reviews.facade';

@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'agent')
export class AdminController {
  constructor(
    private readonly adminFacade: AdminFacade,
    private readonly usersFacade: UsersFacade,
    private readonly profileFacade: ExpertProfileFacade,
    private readonly chatFacade: ChatFacade,
    private readonly couponFacade: CouponFacade,
    private readonly reviewsFacade: ReviewsFacade,
  ) { }

  // Review Management
  @Get('reviews')
  async getReviews(@Query() query: any) {
    return this.reviewsFacade.getAdminReviews(query);
  }

  @Get('reviews/stats')
  async getReviewStats() {
    return this.reviewsFacade.getAllReviewsStats();
  }

  @Patch('reviews/:id/status')
  async updateReviewStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.reviewsFacade.updateReviewStatus(id, status);
  }

  @Delete('reviews/:id')
  async deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsFacade.deleteReview(id);
  }

  @Post('reviews/:id/response')
  async sendReviewResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body('message') message: string,
  ) {
    return this.reviewsFacade.sendReviewResponse(id, message);
  }

  @Get('analytics/user-growth')
  async getUserGrowthStats(@Query('days') days: number = 7) {
    return this.adminFacade.getUserGrowthStats(days);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminFacade.getDashboardStats();
  }

  @Get('analytics/revenue-trend')
  async getRevenueTrend(@Query('days') days: number = 7) {
    return this.adminFacade.getRevenueTrend(days);
  }

  @Get('analytics/earnings-breakdown')
  async getEarningsBreakdown(@Query('days') days: number = 7) {
    return this.adminFacade.getEarningsBreakdown(days);
  }

  @Get('analytics/top-experts')
  async getTopExperts(@Query('limit') limit: number = 5) {
    return this.adminFacade.getTopExperts(limit);
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
    @Query('status') status?: string,
  ) {
    return this.usersFacade.findAllByRole('expert', search, page, limit, status);
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

  @Get('live-sessions/stats')
  async getLiveSessionStats() {
    return this.chatFacade.getSessionStats();
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

  // Withdrawal Management
  @Get('withdrawals')
  async getWithdrawals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.adminFacade.getWithdrawals(page, limit, status, role);
  }


  @Get('withdrawals/stats')
  async getWithdrawalStats(@Query('role') role?: string) {
    return this.adminFacade.getWithdrawalStats(role);
  }


  @Patch('withdrawals/:id/status')
  async updateWithdrawalStatus(
    @Param('id') id: number,
    @CurrentUser() admin: User,
    @Body() body: { status: WithdrawalStatus; remark?: string },
  ) {
    return this.adminFacade.updateWithdrawalStatus(id, body.status, admin.id, body.remark);
  }

  // Bulk Coupon Assignment Utilities
  @Post('users/filter-count')
  async getFilteredUsersCount(@Body() filters: any) {
    const count = await this.adminFacade.getFilteredUsersCount(filters);
    return { count };
  }

  @Post('users/filtered-list')
  async getFilteredUsersList(@Body() filters: any) {
    return this.adminFacade.getFilteredUsersList(filters);
  }

  @Post('coupons/assign-bulk')
  async assignCouponBulk(@Body() dto: { couponCode: string; filters: FilterCriteria }) {
    return this.adminFacade.assignCouponBulk(dto.couponCode, dto.filters);
  }


  @Get('merchants')
  async getAllMerchants(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminFacade.getAllMerchants({ search, status, page, limit });
  }

  @Patch('merchants/:id/status')
  async updateMerchantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    return this.adminFacade.updateMerchantStatus(id, body);
  }

  @Get('merchant-sales')
  async getMerchantSalesOverview() {
    return this.adminFacade.getMerchantSalesOverview();
  }

  @Get('merchant-sales/:id')
  async getMerchantSalesDetails(@Param('id', ParseIntPipe) id: number) {
    return this.adminFacade.getMerchantSalesDetails(id);
  }

  // ── Agents Endpoints ────────────────────────────────────────────────────────
  @Post('agents')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profile_pic', maxCount: 1 },
    { name: 'aadhaar_doc', maxCount: 1 },
    { name: 'pan_doc', maxCount: 1 },
  ]))
  async createAgent(
    @Body() dto: CreateAgentDto,
    @UploadedFiles() files: {
      profile_pic?: Express.Multer.File[];
      aadhaar_doc?: Express.Multer.File[];
      pan_doc?: Express.Multer.File[];
    },
  ) {
    console.log('Creating agent with DTO:', dto);
    const filesToUpload = {
      profile_pic: files?.profile_pic?.[0],
      aadhaar_doc: files?.aadhaar_doc?.[0],
      pan_doc: files?.pan_doc?.[0],
    };
    return this.adminFacade.createAgent(dto, filesToUpload);
  }

  @Get('agents')
  async getAgents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminFacade.getAgents({ page, limit, search, status });
  }

  @Get('agents/stats')
  async getAgentStats() {
    return this.adminFacade.getAgentStats();
  }

  @Get('listings')
  async getListings(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminFacade.getListings({ type, search, page, limit });
  }

  @Patch('listings/:id/status')
  async updateListingStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminFacade.updateListingStatus(id, status);
  }

  // --- Support / Disputes Management ---
  @Get('support/disputes')
  async getAllDisputes(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminFacade.getAllDisputes({ status, page: Number(page), limit: Number(limit) });
  }

  @Get('support/disputes/:id')
  async getDisputeById(@Param('id', ParseIntPipe) id: number) {
    return this.adminFacade.getDisputeById(id);
  }

  @Patch('support/disputes/:id/status')
  async updateDisputeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminFacade.updateDisputeStatus(id, status, notes);
  }

  @Get('support/disputes/:id/messages')
  async getDisputeMessages(@Param('id', ParseIntPipe) id: number) {
    return this.adminFacade.getDisputeMessages(id);
  }

  @Post('support/disputes/:id/messages')
  async sendDisputeMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
    @Body() data: { message: string },
  ) {
    return this.adminFacade.sendDisputeMessage(id, admin.id, data);
  }
}
