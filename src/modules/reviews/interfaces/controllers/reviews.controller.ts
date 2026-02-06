import { Controller, Post, Get, Body, Param, UseGuards, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CreateReviewDto } from '../../application/dtos/create-review.dto';
import { ReviewsService } from '../../application/services/reviews.service';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: User,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, body);
  }

  @Get('expert/:expertId')
  async getReviews(
    @Param('expertId', ParseIntPipe) expertId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getExpertReviews(expertId, page, limit);
  }

  @Get('expert/:expertId/stats')
  async getStats(@Param('expertId', ParseIntPipe) expertId: number) {
    return this.reviewsService.getReviewsStats(expertId);
  }
}

