import { Injectable } from "@nestjs/common";
import { GetExpertReviewsUseCase } from "./use-cases/get-expert-reviews.use-case";
import { GetExpertReviewsStatsUseCase } from "./use-cases/get-expert-reviews-stats.use-case";
import { GetExpertReviewsByDateUseCase } from "./use-cases/get-expert-reviews-by-date.use-case";
import { GetExpertReviewsDto } from "./dto/get-expert-reviews.dto";
import { GetExpertReviewsByDateDto } from "./dto/get-expert-reviews-by-date.dto";

@Injectable()
export class ExpertReviewsService {
  constructor(
    private readonly getExpertReviewsUseCase: GetExpertReviewsUseCase,
    private readonly getExpertReviewsStatsUseCase: GetExpertReviewsStatsUseCase,
    private readonly getExpertReviewsByDateUseCase: GetExpertReviewsByDateUseCase,
  ) {}

  async getExpertReviews(expert_id: number, dto: GetExpertReviewsDto) {
    return this.getExpertReviewsUseCase.execute(expert_id, dto);
  }

  async getExpertReviewsStats(expert_id: number) {
    return this.getExpertReviewsStatsUseCase.execute(expert_id);
  }

  async getExpertReviewsByDate(
    expert_id: number,
    dto: GetExpertReviewsByDateDto,
  ) {
    return this.getExpertReviewsByDateUseCase.execute(expert_id, dto);
  }
}
