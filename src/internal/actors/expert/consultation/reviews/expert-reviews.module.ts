import { Module } from "@nestjs/common";
import { ExpertReviewsController } from "./controllers/reviews.controller";
import { ExpertReviewsService } from "./expert-reviews.service";
import { GetExpertReviewsUseCase } from "./use-cases/get-expert-reviews.use-case";
import { GetExpertReviewsStatsUseCase } from "./use-cases/get-expert-reviews-stats.use-case";
@Module({
  controllers: [ExpertReviewsController],
  providers: [
    ExpertReviewsService,
    GetExpertReviewsUseCase,
    GetExpertReviewsStatsUseCase,
  ],
  exports: [ExpertReviewsService],
})
export class ExpertReviewsModule {}
