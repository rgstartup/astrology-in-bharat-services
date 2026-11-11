import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import { ClientJwtAuthGuard } from '@/internal/actors/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/actors/client/auth/decorators/current-client.decorator';
import { ClientAccount } from '@/internal/actors/client/account/entities/account.entity';
import { ClientReviewsService } from '../client-reviews.service';
import { CreateReviewDto } from '../dto/create-review.dto';
import { GetClientReviewsDto } from '../dto/get-client-reviews.dto';
import { GetClientReviewsByDateDto } from '../dto/get-client-reviews-by-date.dto';
import { ReviewDomain } from '../reviews.mapper';

@Controller({
  path: 'client/reviews',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientReviewsController {
  constructor(private readonly clientReviewsService: ClientReviewsService) {}

  @Post()
  async createReview(
    @CurrentClient() client: ClientAccount,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDomain> {
    return this.clientReviewsService.createReview(client.id, dto);
  }

  @Get()
  async getMyReviews(
    @CurrentClient() client: ClientAccount,
    @Query() dto: GetClientReviewsDto,
  ): Promise<PaginatedResponseDto<ReviewDomain>> {
    const result = await this.clientReviewsService.getClientReviews(
      client.id,
      dto,
    );
    return PaginatedResponseDto.from(result.data, result.total, {
      page: dto.page,
      limit: dto.limit,
    });
  }

  @Get('stats')
  async getMyReviewsStats(@CurrentClient() client: ClientAccount) {
    return this.clientReviewsService.getClientReviewsStats(client.id);
  }

  @Get('by-date')
  async getMyReviewsByDate(
    @CurrentClient() client: ClientAccount,
    @Query() dto: GetClientReviewsByDateDto,
  ): Promise<PaginatedResponseDto<ReviewDomain>> {
    const result = await this.clientReviewsService.getClientReviewsByDate(
      client.id,
      dto,
    );
    return PaginatedResponseDto.from(result.data, result.total, {
      page: dto.page,
      limit: dto.limit,
    });
  }
}