import { Injectable } from '@nestjs/common';
import { CreateReviewUseCase } from './use-cases/create-review.use-case';
import { GetClientReviewsUseCase } from './use-cases/get-client-reviews.use-case';
import { GetClientReviewsStatsUseCase } from './use-cases/get-client-reviews-stats.use-case';
import { GetClientReviewsByDateUseCase } from './use-cases/get-client-reviews-by-date.use-case';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetClientReviewsDto } from './dto/get-client-reviews.dto';
import { GetClientReviewsByDateDto } from './dto/get-client-reviews-by-date.dto';

@Injectable()
export class ClientReviewsService {
  constructor(
    private readonly createReviewUseCase: CreateReviewUseCase,
    private readonly getClientReviewsUseCase: GetClientReviewsUseCase,
    private readonly getClientReviewsStatsUseCase: GetClientReviewsStatsUseCase,
    private readonly getClientReviewsByDateUseCase: GetClientReviewsByDateUseCase,
  ) {}

  async createReview(clientId: number, dto: CreateReviewDto) {
    return this.createReviewUseCase.execute(clientId, dto);
  }

  async getClientReviews(clientId: number, dto: GetClientReviewsDto) {
    return this.getClientReviewsUseCase.execute(clientId, dto);
  }

  async getClientReviewsStats(clientId: number) {
    return this.getClientReviewsStatsUseCase.execute(clientId);
  }

  async getClientReviewsByDate(
    clientId: number,
    dto: GetClientReviewsByDateDto,
  ) {
    return this.getClientReviewsByDateUseCase.execute(clientId, dto);
  }
}