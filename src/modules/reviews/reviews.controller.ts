import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: User,
    @Body()
    body: {
      expertId: number;
      sessionId?: number;
      rating: number;
      comment?: string;
    },
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
