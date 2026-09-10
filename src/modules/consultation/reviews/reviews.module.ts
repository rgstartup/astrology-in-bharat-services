import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './controllers/reviews.controller';
import { Review } from './entities/review.entity';
import { ChatSession } from '@/modules/consultation/chat/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/entities/call-session.entity';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { NotificationModule } from '@/modules/notification/notification.module';

import { ReviewsFacade } from './reviews.facade';
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

import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { ProfileModule as MerchantProfileModule } from '@/modules/merchant/profile/profile.module';
import { OrderModule } from '@/modules/client/commerce/order/order.module';

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
