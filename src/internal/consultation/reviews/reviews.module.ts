import { Module } from '@nestjs/common';
import { ReviewsController } from './controllers/reviews.controller';
import { NotificationModule } from '../../notification/notification.module';

import { ReviewsService } from './reviews.service';
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

@Module({
  imports: [NotificationModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    CreateReviewUseCase,
    GetExpertReviewsUseCase,
    GetMerchantReviewsUseCase,
    GetReviewsStatsUseCase,
    GetMerchantReviewsStatsUseCase,
    GetAdminReviewsUseCase,
    GetAdminReviewsStatsUseCase,
    UpdateReviewStatusUseCase,
    DeleteReviewUseCase,
    SendReviewResponseUseCase,
    GetApprovedPlatformReviewsUseCase,
    GetExpertReviewsByDateUseCase,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
