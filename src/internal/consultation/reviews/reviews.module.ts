import { Module } from '@nestjs/common';
import { ReviewsController } from './controllers/reviews.controller';
import { NotificationModule } from '../../notification/notification.module';

import { ReviewsService } from './reviews.service';
import { GetMerchantReviewsUseCase } from './use-cases/get-merchant-reviews.use-case';
import { GetMerchantReviewsStatsUseCase } from './use-cases/get-merchant-reviews-stats.use-case';
import { GetAdminReviewsUseCase } from './use-cases/get-admin-reviews.use-case';
import { GetAdminReviewsStatsUseCase } from './use-cases/get-admin-reviews-stats.use-case';
import { UpdateReviewStatusUseCase } from './use-cases/update-review-status.use-case';
import { DeleteReviewUseCase } from './use-cases/delete-review.use-case';
import { SendReviewResponseUseCase } from './use-cases/send-review-response.use-case';
import { GetApprovedPlatformReviewsUseCase } from './use-cases/get-approved-platform-reviews.use-case';

@Module({
  imports: [NotificationModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    GetMerchantReviewsUseCase,
    GetMerchantReviewsStatsUseCase,
    GetAdminReviewsUseCase,
    GetAdminReviewsStatsUseCase,
    UpdateReviewStatusUseCase,
    DeleteReviewUseCase,
    SendReviewResponseUseCase,
    GetApprovedPlatformReviewsUseCase,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
