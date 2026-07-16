import { Injectable } from '@nestjs/common';
import { CreateReviewUseCase } from './use-cases/create-review.use-case';
import { GetExpertReviewsUseCase } from './use-cases/get-expert-reviews.use-case';
import { GetMerchantReviewsUseCase } from './use-cases/get-merchant-reviews.use-case';
import { GetReviewsStatsUseCase } from './use-cases/get-reviews-stats.use-case';
import { GetMerchantReviewsStatsUseCase } from './use-cases/get-merchant-reviews-stats.use-case';
import { GetAdminReviewsUseCase } from './use-cases/get-admin-reviews.use-case';
import { GetAdminReviewsStatsUseCase } from './use-cases/get-admin-reviews-stats.use-case';
import { UpdateReviewStatusUseCase } from './use-cases/update-review-status.use-case';
import { DeleteReviewUseCase } from './use-cases/delete-review.use-case';
import { SendReviewResponseUseCase } from './use-cases/send-review-response.use-case';
import { GetApprovedPlatformReviewsUseCase } from './use-cases/get-approved-platform-reviews.use-case';
import { GetExpertReviewsByDateUseCase } from './use-cases/get-expert-reviews-by-date.use-case';
import { CreateReviewDto } from '../api/dto/create-review.dto';
import { GetReviewsDto } from '../api/dto/get-reviews.dto';
import { GetAdminReviewsDto } from '../api/dto/get-admin-reviews.dto';

@Injectable()
export class ReviewsFacade {
  constructor(
    private readonly createReviewUseCase: CreateReviewUseCase,
    private readonly getExpertReviewsUseCase: GetExpertReviewsUseCase,
    private readonly getMerchantReviewsUseCase: GetMerchantReviewsUseCase,
    private readonly getReviewsStatsUseCase: GetReviewsStatsUseCase,
    private readonly getMerchantReviewsStatsUseCase: GetMerchantReviewsStatsUseCase,
    private readonly getAdminReviewsUseCase: GetAdminReviewsUseCase,
    private readonly getAdminReviewsStatsUseCase: GetAdminReviewsStatsUseCase,
    private readonly deleteReviewUseCase: DeleteReviewUseCase,
    private readonly updateReviewStatusUseCase: UpdateReviewStatusUseCase,
    private readonly sendReviewResponseUseCase: SendReviewResponseUseCase,
    private readonly getApprovedPlatformReviewsUseCase: GetApprovedPlatformReviewsUseCase,
    private readonly getExpertReviewsByDateUseCase: GetExpertReviewsByDateUseCase,
  ) {}

  async createReview(clientId: string, dto: CreateReviewDto) {
    return this.createReviewUseCase.execute(clientId, dto);
  }

  async getExpertReviews(
    expert_id: string,
    dto: GetReviewsDto,
  ) {
    return this.getExpertReviewsUseCase.execute(expert_id, dto);
  }

  async getMerchantReviews(
    merchantId: string,
    dto: GetReviewsDto,
  ) {
    return this.getMerchantReviewsUseCase.execute(merchantId, dto);
  }

  async getReviewsStats(expert_id: string) {
    return this.getReviewsStatsUseCase.execute(expert_id);
  }

  async getMerchantReviewsStats(merchantId: string) {
    return this.getMerchantReviewsStatsUseCase.execute(merchantId);
  }

  async getAdminReviews(
    dto: GetAdminReviewsDto,
  ) {
    return this.getAdminReviewsUseCase.execute(dto);
  }

  async getAllReviewsStats() {
    return this.getAdminReviewsStatsUseCase.execute();
  }

  async updateReviewStatus(id: string, status: string) {
    return this.updateReviewStatusUseCase.execute(id, status);
  }

  async deleteReview(id: string) {
    return this.deleteReviewUseCase.execute(id);
  }

  async sendReviewResponse(id: string, message: string) {
    return this.sendReviewResponseUseCase.execute(id, message);
  }

  async getApprovedPlatformReviews(limit?: number) {
    return this.getApprovedPlatformReviewsUseCase.execute(limit);
  }

  async getExpertReviewsByDate(
    expert_id: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.getExpertReviewsByDateUseCase.execute(
      expert_id,
      startDate,
      endDate,
    );
  }
}
