import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './api/controllers/reviews.controller';
import { Review } from './infrastructure/entities/review.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';

import { ReviewsFacade } from './application/reviews.facade';
import { CreateReviewUseCase } from './application/use-cases/create-review.use-case';
import { GetExpertReviewsUseCase } from './application/use-cases/get-expert-reviews.use-case';
import { GetMerchantReviewsUseCase } from './application/use-cases/get-merchant-reviews.use-case';
import { GetReviewsStatsUseCase } from './application/use-cases/get-reviews-stats.use-case';
import { GetMerchantReviewsStatsUseCase } from './application/use-cases/get-merchant-reviews-stats.use-case';
import { GetAdminReviewsUseCase } from './application/use-cases/get-admin-reviews.use-case';
import { GetAdminReviewsStatsUseCase } from './application/use-cases/get-admin-reviews-stats.use-case';
import { UpdateReviewStatusUseCase } from './application/use-cases/update-review-status.use-case';
import { DeleteReviewUseCase } from './application/use-cases/delete-review.use-case';
import { SendReviewResponseUseCase } from './application/use-cases/send-review-response.use-case';
import { GetApprovedPlatformReviewsUseCase } from './application/use-cases/get-approved-platform-reviews.use-case';
import { GetExpertReviewsByDateUseCase } from './application/use-cases/get-expert-reviews-by-date.use-case';

import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { ProfileModule as MerchantProfileModule } from '@/modules/merchant/profile/profile.module';
import { OrderModule } from '@/modules/commerce/order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ChatSession, CallSession]),
    forwardRef(() => WalletModule),
    NotificationModule,
    forwardRef(() => ExpertProfileModule),
    forwardRef(() => MerchantProfileModule),
    forwardRef(() => OrderModule),
  ],
  controllers: [ReviewsController],
  providers: [
    ReviewsFacade,
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
  exports: [ReviewsFacade],
})
export class ReviewsModule {}
