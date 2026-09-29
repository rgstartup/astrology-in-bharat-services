import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  UseInterceptors,
  UploadedFiles,
  Delete,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '@/internal/users/users.service';
import { AdminService } from '../admin.service';
import { Roles } from '@/shared/decorators/roles.decorator';
import { RolesGuard } from '@/internal/auth/guards/role.guard';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { AdminPermissionGuard } from '@/shared/guards/admin-permission.guard';
import { RequirePermissions } from '@/shared/decorators/permissions.decorator';
import { AdminPermission } from '@/internal/users/enums/AdminPermission.enum';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { CouponService } from '@/internal/commerce/coupon/coupon.service';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { type IUser } from '@/shared/types/access-token.payload';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { ReviewsService } from '@/internal/consultation/reviews/reviews.service';
import { RoleEnum, RolePipe } from '@/internal/users/enums/Role.enum';
import { MerchantStatus } from '@/internal/actors/merchant/account/entities/account.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GetReviewsDTO } from '../dto/get-reviews.dto';
import { CreateAgentDto } from '../dto/create-agent.dto';

// New DTO imports
import { GetClientsDto } from '../dto/get-clients.dto';
import { GetExpertsDto } from '../dto/get-experts.dto';
import { GetLiveSessionsDto } from '../dto/get-live-sessions.dto';
import { TerminateSessionDto } from '../dto/terminate-session.dto';
import { GetWithdrawalsDto } from '../dto/get-withdrawals.dto';
import { UpdateWithdrawalStatusDto } from '../dto/update-withdrawal-status.dto';
import { UpdateExpertStatusDto } from '../dto/update-expert-status.dto';
import { AssignCouponBulkDto } from '../dto/assign-coupon-bulk.dto';
import { GetAdminMerchantsDto } from '../dto/get-merchants.dto';
import { GetAgentsDto } from '../dto/get-agents.dto';
import { GetAdminListingsDto } from '../dto/get-listings.dto';
import { GetDisputesDto } from '../dto/get-disputes.dto';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';

@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles('ADMIN', 'AGENT')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly chatService: ChatService,
    private readonly couponService: CouponService,
    private readonly reviewsService: ReviewsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Review Management
  @RequirePermissions(AdminPermission.REVIEWS_MODERATION)
  @Get('reviews')
  async getReviews(@Query() query: GetReviewsDTO) {
    return this.reviewsService.getAdminReviews(query);
  }
  @RequirePermissions(AdminPermission.REVIEWS_MODERATION)
  @Get('reviews/stats')
  async getReviewStats() {
    return this.reviewsService.getAllReviewsStats();
  }
  @RequirePermissions(AdminPermission.REVIEWS_MODERATION)
  @Patch('reviews/:id/status')
  async updateReviewStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.reviewsService.updateReviewStatus(id, status);
  }
  @RequirePermissions(AdminPermission.REVIEWS_MODERATION)
  @Delete('reviews/:id')
  async deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.deleteReview(id);
  }
  @RequirePermissions(AdminPermission.REVIEWS_MODERATION)
  @Post('reviews/:id/response')
  async sendReviewResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body('message') message: string,
  ) {
    return this.reviewsService.sendReviewResponse(id, message);
  }
  @RequirePermissions(AdminPermission.ANALYTICS_DASHBOARD)
  @Get('analytics/user-growth')
  async getUserGrowthStats(@Query('days', ParseIntPipe) days: number = 7) {
    return this.adminService.getUserGrowthStats(days);
  }
  @RequirePermissions(AdminPermission.ANALYTICS_DASHBOARD)
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
  @RequirePermissions(AdminPermission.ANALYTICS_DASHBOARD)
  @Get('analytics/revenue-trend')
  async getRevenueTrend(@Query('days', ParseIntPipe) days: number = 7) {
    return this.adminService.getRevenueTrend(days);
  }
  @RequirePermissions(AdminPermission.ANALYTICS_DASHBOARD)
  @Get('analytics/earnings-breakdown')
  async getEarningsBreakdown(@Query('days', ParseIntPipe) days: number = 7) {
    return this.adminService.getEarningsBreakdown(days);
  }
  @RequirePermissions(AdminPermission.EXPERT_MANAGEMENT)
  @Get('analytics/top-experts')
  async getTopExperts(@Query('limit', ParseIntPipe) limit: number = 5) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.adminService.getTopExperts(limit);
  }
  @RequirePermissions(AdminPermission.EXPERT_MANAGEMENT)
  @Get('experts/stats')
  async getExpertsStats() {
    return this.usersService.getExpertStats();
  }
  @RequirePermissions(AdminPermission.USER_MANAGEMENT)
  @Get('clients/stats')
  async getClientStats() {
    return this.usersService.getClientStats();
  }
  @RequirePermissions(AdminPermission.USER_MANAGEMENT)
  @Get('clients')
  async getAllUsers(@Query() query: GetClientsDto) {
    return this.adminService.getAllClients(query);
  }
  @RequirePermissions(AdminPermission.USER_MANAGEMENT)
  @Get('clients/:id')
  async getClientDetail(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }
  @RequirePermissions(AdminPermission.EXPERT_MANAGEMENT)
  @Get('experts')
  async getAllExperts(@Query() query: GetExpertsDto) {
    return this.adminService.getAllExperts(query);
  }
  @RequirePermissions(AdminPermission.EXPERT_MANAGEMENT)
  @Get('experts/:id')
  async getExpertDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getExpertDetail(id);
  }
  @RequirePermissions(AdminPermission.EXPERT_MANAGEMENT)
  @Patch('experts/:id/status')
  async updateExpertStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateExpertStatusDto,
  ) {
    await this.adminService.updateExpertStatus(id, body);
    return { success: true };
  }
  @RequirePermissions(AdminPermission.USER_MANAGEMENT)
  @Patch('clients/:id/block')
  async toggleUserBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isBlocked: boolean },
    @CurrentUser() admin: IUser,
  ) {
    const result = await this.adminService.toggleUserBlock({
      targetUserId: id,
      isBlocked: body.isBlocked,
      adminId: admin.id,
      adminName: admin.email, // email use karo kyunki name optional ho sakta hai
    });

    // Agar block ho raha hai to event emit karo (existing logic preserved)
    if (body.isBlocked) {
      this.eventEmitter.emit('user.blocked', { userId: id });
    }

    return result;
  }
  @RequirePermissions(AdminPermission.LIVE_SESSIONS)
  @Get('live-sessions')
  async getLiveSessions(@Query() query: GetLiveSessionsDto) {
    return this.adminService.getLiveSessions(query);
  }
  @RequirePermissions(AdminPermission.LIVE_SESSIONS)
  @Get('live-sessions/stats')
  async getLiveSessionStats() {
    return this.chatService.getSessionStats();
  }
  @RequirePermissions(AdminPermission.LIVE_SESSIONS)
  @Get('live-sessions/:id/history')
  async getChatHistory(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.getHistory(id);
  }
  @RequirePermissions(AdminPermission.LIVE_SESSIONS)
  @Post('live-sessions/:id/terminate')
  async terminateSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: IUser,
    @Body() body: TerminateSessionDto,
  ) {
    try {
      return await this.adminService.terminateSession(id, admin.id, body);
    } catch (error: unknown) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to terminate session',
      };
    }
  }

  // Coupon Management
  @RequirePermissions(AdminPermission.COUPONS_OFFERS)
  @Get('coupons')
  async getCoupons(@Query() query: Record<string, unknown>) {
    return this.couponService.getCoupons(query);
  }
  @RequirePermissions(AdminPermission.COUPONS_OFFERS)
  @Get('coupons/stats')
  async getCouponStats() {
    return this.couponService.getCouponStats();
  }
  @RequirePermissions(AdminPermission.COUPONS_OFFERS)
  @Post('coupons')
  async createCoupon(@Body() data: Record<string, unknown>) {
    return this.couponService.createCoupon(data);
  }
  @RequirePermissions(AdminPermission.COUPONS_OFFERS)
  @Patch('coupons/:id')
  async updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Record<string, unknown>,
  ) {
    const result = await this.couponService.updateCoupon(id, data);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  // Withdrawal Management
  @RequirePermissions(AdminPermission.PAYOUT_REQUESTS)
  @Get('withdrawals')
  async getWithdrawals(@Query() query: GetWithdrawalsDto) {
    return this.adminService.getWithdrawals(query);
  }
  @RequirePermissions(AdminPermission.PAYOUT_REQUESTS)
  @Get('withdrawals/stats')
  async getWithdrawalStats(
    @Query('role', RolePipe({ optional: true })) role?: RoleEnum,
  ) {
    return this.adminService.getWithdrawalStats(role);
  }
  @RequirePermissions(AdminPermission.PAYOUT_REQUESTS)
  @Patch('withdrawals/:id/status')
  async updateWithdrawalStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: IUser,
    @Body() body: UpdateWithdrawalStatusDto,
  ) {
    await this.adminService.updateWithdrawalStatus(id, admin.id, body);
    return { success: true };
  }

  // Bulk Coupon Assignment Utilities
  @RequirePermissions(AdminPermission.USER_MANAGEMENT)
  @Post('clients/filter-count')
  async getFilteredUsersCount(@Body() filters: Record<string, unknown>) {
    const count = await this.adminService.getFilteredUsersCount(filters);
    return { count };
  }
  @RequirePermissions(AdminPermission.USER_MANAGEMENT)
  @Post('clients/filtered-list')
  async getFilteredUsersList(@Body() filters: Record<string, unknown>) {
    return this.adminService.getFilteredUsersList(filters);
  }
  @RequirePermissions(AdminPermission.COUPONS_OFFERS)
  @Post('coupons/assign-bulk')
  async assignCouponBulk(@Body() dto: AssignCouponBulkDto) {
    const { couponCode, filters } = dto;
    const limit = 1000; // Process in chunks to prevent OOM
    let page = 1;
    let totalAssigned = 0;

    while (true) {
      const userIds = await this.usersService.getFilteredUsersIds({
        ...filters,
        page,
        limit,
      });

      if (!userIds || userIds.length === 0) break;

      await this.couponService.bulkAssign(couponCode, userIds);
      totalAssigned += userIds.length;

      if (userIds.length < limit) break;
      page++;
    }

    if (totalAssigned === 0) {
      throw new BadRequestException(
        'No users found matching the selected filters',
      );
    }
    return { success: true, assignedCount: totalAssigned };
  }
  @RequirePermissions(AdminPermission.SHOP_MANAGEMENT)
  @Get('merchants')
  async getAllMerchants(@Query() query: GetAdminMerchantsDto) {
    return this.adminService.getAllMerchants(query);
  }
  @RequirePermissions(AdminPermission.SHOP_MANAGEMENT)
  @Patch('merchants/:id/status')
  async updateMerchantStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: MerchantStatus },
  ) {
    return this.adminService.updateMerchantStatus(id, body);
  }
  @RequirePermissions(AdminPermission.SHOP_MANAGEMENT)
  @Get('merchant-sales')
  async getMerchantSalesOverview() {
    return this.adminService.getMerchantSalesOverview();
  }
  @RequirePermissions(AdminPermission.SHOP_MANAGEMENT)
  @Get('merchant-sales/:id')
  async getMerchantSalesDetails(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getMerchantSalesDetails(id);
  }

  // ─── Agents Endpoints ──────────────────────────────────────────────────────────
  @Post('agents')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profile_pic', maxCount: 1 },
      { name: 'aadhaar_doc', maxCount: 1 },
      { name: 'pan_doc', maxCount: 1 },
    ]),
  )
  @RequirePermissions(AdminPermission.AGENT_MANAGEMENT)
  async createAgent(
    @Body() dto: CreateAgentDto,
    @UploadedFiles()
    files: {
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
    return this.adminService.createAgent(dto, filesToUpload);
  }
  @RequirePermissions(AdminPermission.AGENT_MANAGEMENT)
  @Get('agents')
  async getAgents(@Query() query: GetAgentsDto) {
    return this.adminService.getAgents(query);
  }
  @RequirePermissions(AdminPermission.AGENT_MANAGEMENT)
  @Get('agents/stats')
  async getAgentStats() {
    return this.adminService.getAgentStats();
  }
  @RequirePermissions(AdminPermission.PRODUCTS)
  @Get('listings')
  async getListings(@Query() query: GetAdminListingsDto) {
    return this.adminService.getListings(query);
  }
  @RequirePermissions(AdminPermission.PRODUCTS)
  @Patch('listings/:id/status')
  async updateListingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const result = await this.adminService.updateListingStatus(id, status);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  // --- Support / Disputes Management ---
  @Get('support/disputes')
  async getAllDisputes(@Query() query: GetDisputesDto) {
    return this.adminService.getAllDisputes(query);
  }

  @Get('support/disputes/:id')
  async getDisputeById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getDisputeById(id);
  }

  @Patch('support/disputes/:id/status')
  async updateDisputeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDisputeStatusDto,
  ) {
    await this.adminService.updateDisputeStatus(id, body);
    return { success: true };
  }

  @Get('support/disputes/:id/messages')
  async getDisputeMessages(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getDisputeMessages(id);
  }

  @Post('support/disputes/:id/messages')
  async sendDisputeMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: IUser,
    @Body() data: { message: string },
  ) {
    return this.adminService.sendDisputeMessage(id, admin.id, data);
  }
}
