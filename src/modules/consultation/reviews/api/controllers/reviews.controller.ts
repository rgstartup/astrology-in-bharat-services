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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReviewsFacade } from '../../application/reviews.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateReviewDto } from '../dto/create-review.dto';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

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
    @CurrentUser('id') userId: number,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsFacade.createReview(userId, body);
  }

  // ─── Public: Get approved platform reviews for homepage ─────────────────────
  @Get('platform/approved')
  async getApprovedPlatformReviews(
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.reviewsFacade.getApprovedPlatformReviews(limit);
  }

  // ─── Public: Expert reviews ─────────────────────────────────────────────────
  @Get('expert/:expertId')
  async getReviews(
    @Param('expertId', ParseIntPipe) expertId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsFacade.getExpertReviews(expertId, page, limit);
  }

  @Get('expert/:expertId/stats')
  async getStats(@Param('expertId', ParseIntPipe) expertId: number) {
    return this.reviewsFacade.getReviewsStats(expertId);
  }

  // ─── Public: Merchant reviews ────────────────────────────────────────────────
  @Get('merchant/:merchantId')
  async getMerchantReviews(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsFacade.getMerchantReviews(merchantId, page, limit);
  }

  // ─── Admin: Get all reviews (with filters) ───────────────────────────────────
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminGetAllReviews(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('ratingType') ratingType?: string,
    @Query('review_type') review_type?: string,
  ) {
    return this.reviewsFacade.getAdminReviews({ page, limit, status, search, ratingType, review_type });
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
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.reviewsFacade.updateReviewStatus(id, status);
  }

  // ─── Admin: Delete a review ───────────────────────────────────────────────────
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN') 
  async deleteReview(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsFacade.deleteReview(id);
  }
}
