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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from '../reviews.service';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RolesGuard } from '../../../auth/guards/role.guard';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { CurrentProfile } from '../../../../shared/decorators/current-profile.decorator';
import { CreateReviewDto } from '../dto/create-review.dto';
import { GetReviewsDto } from '../dto/get-reviews.dto';
import { GetAdminReviewsDto } from '../dto/get-admin-reviews.dto';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ─── User: Create any review (expert, merchant, platform) ───────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentProfile() clientId: number,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(clientId, body);
  }

  // ─── Public: Get approved platform reviews for homepage ─────────────────────
  @Get('platform/approved')
  async getApprovedPlatformReviews(
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getApprovedPlatformReviews(limit);
  }

  // ─── Public: Expert reviews ─────────────────────────────────────────────────
  @Get('expert/:expert_id')
  async getReviews(
    @Param('expert_id', ParseIntPipe) expert_id: number,
    @Query() dto: GetReviewsDto,
  ) {
    return this.reviewsService.getExpertReviews(expert_id, dto);
  }

  @Get('expert/:expert_id/stats')
  async getStats(@Param('expert_id', ParseIntPipe) expert_id: number) {
    return this.reviewsService.getReviewsStats(expert_id);
  }

  // ─── Public: Merchant reviews ────────────────────────────────────────────────
  @Get('merchant/:merchantId')
  async getMerchantReviews(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query() dto: GetReviewsDto,
  ) {
    return this.reviewsService.getMerchantReviews(merchantId, dto);
  }

  // ─── Admin: Get all reviews (with filters) ───────────────────────────────────
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminGetAllReviews(@Query() dto: GetAdminReviewsDto) {
    return this.reviewsService.getAdminReviews(dto);
  }

  // ─── Admin: Get reviews stats ─────────────────────────────────────────────────
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminGetStats() {
    return this.reviewsService.getAllReviewsStats();
  }

  // ─── Admin: Approve / reject a review ────────────────────────────────────────
  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    await this.reviewsService.updateReviewStatus(id, status);
    return { success: true };
  }

  // ─── Admin: Delete a review ───────────────────────────────────────────────────
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteReview(@Param('id', ParseIntPipe) id: number) {
    await this.reviewsService.deleteReview(id);
    return { success: true };
  }
}
