import { Injectable } from "@nestjs/common";
import { GetExpertReviewsUseCase } from "./use-cases/get-expert-reviews.use-case";
import { GetExpertReviewsStatsUseCase } from "./use-cases/get-expert-reviews-stats.use-case";
import { GetExpertReviewsDto } from "./dto/get-expert-reviews.dto";

@Injectable()
export class ExpertReviewsService {
  constructor(
    private readonly getExpertReviewsUseCase: GetExpertReviewsUseCase,
    private readonly getExpertReviewsStatsUseCase: GetExpertReviewsStatsUseCase,
  ) {}

  async getExpertReviews(expert_id: number, dto: GetExpertReviewsDto) {
    return this.getExpertReviewsUseCase.execute(expert_id, dto);
  }

  async getExpertReviewsStats(expert_id: number) {
    return this.getExpertReviewsStatsUseCase.execute(expert_id);
  }
}
