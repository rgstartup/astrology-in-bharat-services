import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsFacade } from '../../application/reviews.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { CreateReviewDto } from '../dto/create-review.dto';
import { GetReviewsDto } from '../dto/get-reviews.dto';
import { GetAdminReviewsDto } from '../dto/get-admin-reviews.dto';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(private readonly reviewsFacade: ReviewsFacade) {}

  // ─── User: Create any review (expert, merchant, platform) ───────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentProfile() clientId: string,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsFacade.createReview(clientId, body);
  }

  // ─── Public: Get approved platform reviews for homepage ─────────────────────
  @Get('platform/approved')
  async getApprovedPlatformReviews(
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.reviewsFacade.getApprovedPlatformReviews(limit);
  }

  // ─── Public: Expert reviews ─────────────────────────────────────────────────
  @Get('expert/:expert_id')
  async getReviews(
    @Param('expert_id', ParseUUIDPipe) expert_id: string,
    @Query() dto: GetReviewsDto,
  ) {
    return this.reviewsFacade.getExpertReviews(expert_id, dto);
  }

  @Get('expert/:expert_id/stats')
  async getStats(@Param('expert_id', ParseUUIDPipe) expert_id: string) {
    return this.reviewsFacade.getReviewsStats(expert_id);
  }

  // ─── Public: Merchant reviews ────────────────────────────────────────────────
  @Get('merchant/:merchantId')
  async getMerchantReviews(
    @Param('merchantId', ParseUUIDPipe) merchantId: string,
    @Query() dto: GetReviewsDto,
  ) {
    return this.reviewsFacade.getMerchantReviews(merchantId, dto);
  }

  // ─── Admin: Get all reviews (with filters) ───────────────────────────────────
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminGetAllReviews(
    @Query() dto: GetAdminReviewsDto,
  ) {
    return this.reviewsFacade.getAdminReviews(dto);
  }

  // ─── Admin: Get reviews stats ─────────────────────────────────────────────────
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminGetStats() {
    return this.reviewsFacade.getAllReviewsStats();
  }

  // ─── Admin: Approve / reject a review ────────────────────────────────────────
  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    await this.reviewsFacade.updateReviewStatus(id, status);
    return { success: true };
  }

  // ─── Admin: Delete a review ───────────────────────────────────────────────────
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteReview(@Param('id', ParseUUIDPipe) id: string) {
    await this.reviewsFacade.deleteReview(id);
    return { success: true };
  }
}
