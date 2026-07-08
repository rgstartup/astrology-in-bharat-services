import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
  Delete,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AdminFacade } from '../../application/admin.facade';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CouponFacade } from '@/modules/commerce/coupon/application/coupon.facade';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';
import { WithdrawalStatus } from '@/modules/finance/wallet/infrastructure/entities/withdrawal.entity';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { ReviewsFacade } from '@/modules/consultation/reviews/application/reviews.facade';
import {
  RoleEnum,
  RolePipe,
} from '@/modules/users/infrastructure/enums/Role.enum';
import { MerchantStatus } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { DisputeStatus } from '@/modules/support/infrastructure/entities/dispute.entity';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'AGENT')
export class AdminController {
  constructor(
    private readonly adminFacade: AdminFacade,
    private readonly usersFacade: UsersFacade,
    private readonly chatFacade: ChatFacade,
    private readonly couponFacade: CouponFacade,
    private readonly reviewsFacade: ReviewsFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Review Management
  @Get('reviews')
  async getReviews(@Query() query: GetReviewsDTO) {
    return this.reviewsFacade.getAdminReviews(query);
  }

  @Get('reviews/stats')
  async getReviewStats() {
    return this.reviewsFacade.getAllReviewsStats();
  }

  @Patch('reviews/:id/status')
  async updateReviewStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.reviewsFacade.updateReviewStatus(id, status);
  }

  @Delete('reviews/:id')
  async deleteReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsFacade.deleteReview(id);
  }

  @Post('reviews/:id/response')
  async sendReviewResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('message') message: string,
  ) {
    return this.reviewsFacade.sendReviewResponse(id, message);
  }

  @Get('analytics/user-growth')
  async getUserGrowthStats(@Query('days', ParseIntPipe) days: number = 7) {
    return this.adminFacade.getUserGrowthStats(days);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminFacade.getDashboardStats();
  }

  @Get('analytics/revenue-trend')
  async getRevenueTrend(@Query('days', ParseIntPipe) days: number = 7) {
    return this.adminFacade.getRevenueTrend(days);
  }

  @Get('analytics/earnings-breakdown')
  async getEarningsBreakdown(@Query('days', ParseIntPipe) days: number = 7) {
    return this.adminFacade.getEarningsBreakdown(days);
  }

  @Get('analytics/top-experts')
  async getTopExperts(@Query('limit', ParseIntPipe) limit: number = 5) {
    return this.adminFacade.getTopExperts(limit);
  }

  @Get('experts/stats')
  async getExpertsStats() {
    return this.usersFacade.getExpertStats();
  }

  @Get('clients/stats')
  async getClientStats() {
    return this.usersFacade.getClientStats();
  }

  @Get('clients')
  async getAllUsers(@Query() query: GetClientsDto) {
    return this.adminFacade.getAllClients(query);
  }

  @Get('clients/:id')
  async getClientDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersFacade.findById(id);
  }

  @Get('experts')
  async getAllExperts(@Query() query: GetExpertsDto) {
    return this.adminFacade.getAllExperts(query);
  }

  @Get('experts/:id')
  async getExpertDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFacade.getExpertDetail(id);
  }

  @Patch('experts/:id/status')
  async updateExpertStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateExpertStatusDto,
  ) {
    await this.adminFacade.updateExpertStatus(id, body);
    return { success: true };
  }

  @Patch('clients/:id/block')
  async toggleUserBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isBlocked: boolean },
  ) {
    const _result = await this.usersFacade.update(id, {
      is_blocked: body.isBlocked,
    } as Partial<User>);
    
    if (body.isBlocked) {
      console.log(`[AdminController] Emitting user.blocked for user: ${id}`);
      this.eventEmitter.emit('user.blocked', { userId: id });
    } else {
      console.log(`[AdminController] Unblocking user: ${id}`);
    }

    return { success: true };
  }

  @Get('live-sessions')
  async getLiveSessions(@Query() query: GetLiveSessionsDto) {
    return this.adminFacade.getLiveSessions(query);
  }

  @Get('live-sessions/stats')
  async getLiveSessionStats() {
    return this.chatFacade.getSessionStats();
  }

  @Get('live-sessions/:id/history')
  async getChatHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.chatFacade.getHistory(id);
  }

  @Post('live-sessions/:id/terminate')
  async terminateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: IUser,
    @Body() body: TerminateSessionDto,
  ) {
    try {
      return await this.adminFacade.terminateSession(
        id,
        admin.id,
        body,
      );
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
  @Get('coupons')
  async getCoupons(@Query() query: Record<string, unknown>) {
    return this.couponFacade.getCoupons(query);
  }

  @Get('coupons/stats')
  async getCouponStats() {
    return this.couponFacade.getCouponStats();
  }

  @Post('coupons')
  async createCoupon(@Body() data: Record<string, unknown>) {
    return this.couponFacade.createCoupon(data);
  }

  @Patch('coupons/:id')
  async updateCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Record<string, unknown>,
  ) {
    const result = await this.couponFacade.updateCoupon(id, data);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  // Withdrawal Management
  @Get('withdrawals')
  async getWithdrawals(@Query() query: GetWithdrawalsDto) {
    return this.adminFacade.getWithdrawals(query);
  }

  @Get('withdrawals/stats')
  async getWithdrawalStats(
    @Query('role', RolePipe({ optional: true })) role?: RoleEnum,
  ) {
    return this.adminFacade.getWithdrawalStats(role);
  }

  @Patch('withdrawals/:id/status')
  async updateWithdrawalStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: IUser,
    @Body() body: UpdateWithdrawalStatusDto,
  ) {
    await this.adminFacade.updateWithdrawalStatus(
      id,
      admin.id,
      body,
    );
    return { success: true };
  }

  // Bulk Coupon Assignment Utilities
  @Post('clients/filter-count')
  async getFilteredUsersCount(@Body() filters: Record<string, unknown>) {
    const count = await this.adminFacade.getFilteredUsersCount(filters);
    return { count };
  }

  @Post('clients/filtered-list')
  async getFilteredUsersList(@Body() filters: Record<string, unknown>) {
    return this.adminFacade.getFilteredUsersList(filters);
  }

  @Post('coupons/assign-bulk')
  async assignCouponBulk(@Body() dto: AssignCouponBulkDto) {
    return this.adminFacade.assignCouponBulk(dto);
  }

  @Get('merchants')
  async getAllMerchants(@Query() query: GetAdminMerchantsDto) {
    return this.adminFacade.getAllMerchants(query);
  }

  @Patch('merchants/:id/status')
  async updateMerchantStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: MerchantStatus },
  ) {
    const result = await this.adminFacade.updateMerchantStatus(id, body);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  @Get('merchant-sales')
  async getMerchantSalesOverview() {
    return this.adminFacade.getMerchantSalesOverview();
  }

  @Get('merchant-sales/:id')
  async getMerchantSalesDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFacade.getMerchantSalesDetails(id);
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
    return this.adminFacade.createAgent(dto, filesToUpload);
  }

  @Get('agents')
  async getAgents(@Query() query: GetAgentsDto) {
    return this.adminFacade.getAgents(query);
  }

  @Get('agents/stats')
  async getAgentStats() {
    return this.adminFacade.getAgentStats();
  }

  @Get('listings')
  async getListings(@Query() query: GetAdminListingsDto) {
    return this.adminFacade.getListings(query);
  }

  @Patch('listings/:id/status')
  async updateListingStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    const result = await this.adminFacade.updateListingStatus(id, status);
    if (result && result.success && 'data' in result) {
      const { data: _data, ...rest } = result as Record<string, unknown>;
      return rest;
    }
    return result;
  }

  // --- Support / Disputes Management ---
  @Get('support/disputes')
  async getAllDisputes(@Query() query: GetDisputesDto) {
    return this.adminFacade.getAllDisputes(query);
  }

  @Get('support/disputes/:id')
  async getDisputeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFacade.getDisputeById(id);
  }

  @Patch('support/disputes/:id/status')
  async updateDisputeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDisputeStatusDto,
  ) {
    await this.adminFacade.updateDisputeStatus(id, body);
    return { success: true };
  }

  @Get('support/disputes/:id/messages')
  async getDisputeMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFacade.getDisputeMessages(id);
  }

  @Post('support/disputes/:id/messages')
  async sendDisputeMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: IUser,
    @Body() data: { message: string },
  ) {
    return this.adminFacade.sendDisputeMessage(id, admin.id, data);
  }
}
