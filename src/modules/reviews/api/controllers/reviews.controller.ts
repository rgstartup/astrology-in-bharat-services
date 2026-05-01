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
  NotFoundException,
} from '@nestjs/common';
import { ReviewsFacade } from '../../application/reviews.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
import { CreateReviewDto } from '../dto/create-review.dto';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(
    private readonly reviewsFacade: ReviewsFacade,
    private readonly userRepository: UserRepository,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateReviewDto,
  ) {
    const localUser = await this.userRepository.findByBetterAuthId(user.id);
    if (!localUser) throw new NotFoundException('User not found');
    return this.reviewsFacade.createReview(localUser.id, body);
  }

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
}
