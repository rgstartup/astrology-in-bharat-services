import { Module } from '@nestjs/common';
import { ClientReviewsController } from './controllers/reviews.controller';
import { ClientReviewsService } from './client-reviews.service';
import { CreateReviewUseCase } from './use-cases/create-review.use-case';
import { GetClientReviewsUseCase } from './use-cases/get-client-reviews.use-case';
import { GetClientReviewsStatsUseCase } from './use-cases/get-client-reviews-stats.use-case';
import { GetClientReviewsByDateUseCase } from './use-cases/get-client-reviews-by-date.use-case';
import { NotificationModule } from '@/internal/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ClientReviewsController],
  providers: [
    ClientReviewsService,
    CreateReviewUseCase,
    GetClientReviewsUseCase,
    GetClientReviewsStatsUseCase,
    GetClientReviewsByDateUseCase,
  ],
  exports: [ClientReviewsService],
})
export class ClientReviewsModule {}