import { Injectable } from '@nestjs/common';
import { GetMerchantReviewsUseCase } from './use-cases/get-merchant-reviews.use-case';
import { GetMerchantReviewsStatsUseCase } from './use-cases/get-merchant-reviews-stats.use-case';
import { GetAdminReviewsUseCase } from './use-cases/get-admin-reviews.use-case';
import { GetAdminReviewsStatsUseCase } from './use-cases/get-admin-reviews-stats.use-case';
import { UpdateReviewStatusUseCase } from './use-cases/update-review-status.use-case';
import { DeleteReviewUseCase } from './use-cases/delete-review.use-case';
import { SendReviewResponseUseCase } from './use-cases/send-review-response.use-case';
import { GetApprovedPlatformReviewsUseCase } from './use-cases/get-approved-platform-reviews.use-case';
import { GetReviewsDto } from './dto/get-reviews.dto';
import { GetAdminReviewsDto } from './dto/get-admin-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly getMerchantReviewsUseCase: GetMerchantReviewsUseCase,
    private readonly getMerchantReviewsStatsUseCase: GetMerchantReviewsStatsUseCase,
    private readonly getAdminReviewsUseCase: GetAdminReviewsUseCase,
    private readonly getAdminReviewsStatsUseCase: GetAdminReviewsStatsUseCase,
    private readonly deleteReviewUseCase: DeleteReviewUseCase,
    private readonly updateReviewStatusUseCase: UpdateReviewStatusUseCase,
    private readonly sendReviewResponseUseCase: SendReviewResponseUseCase,
    private readonly getApprovedPlatformReviewsUseCase: GetApprovedPlatformReviewsUseCase,
  ) {}

  async getMerchantReviews(merchantId: number, dto: GetReviewsDto) {
    return this.getMerchantReviewsUseCase.execute(merchantId, dto);
  }

  async getMerchantReviewsStats(merchantId: number) {
    return this.getMerchantReviewsStatsUseCase.execute(merchantId);
  }

  async getAdminReviews(dto: GetAdminReviewsDto) {
    return this.getAdminReviewsUseCase.execute(dto);
  }

  async getAllReviewsStats() {
    return this.getAdminReviewsStatsUseCase.execute();
  }

  async updateReviewStatus(id: number, status: string) {
    return this.updateReviewStatusUseCase.execute(id, status);
  }

  async deleteReview(id: number) {
    return this.deleteReviewUseCase.execute(id);
  }

  async sendReviewResponse(id: number, message: string) {
    return this.sendReviewResponseUseCase.execute(id, message);
  }

  async getApprovedPlatformReviews(limit?: number) {
    return this.getApprovedPlatformReviewsUseCase.execute(limit);
  }
}
