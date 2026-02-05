import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './domain/entities/review.entity';
import { ReviewsService } from './application/services/reviews.service';
import { ReviewsController } from './interfaces/controllers/reviews.controller';
import { ProfileExpert } from '@/modules/expert';
import { ChatSession } from '@/modules/chat';
import { ExpertModule } from '@/modules/expert/expert.module';
import { ChatModule } from '@/modules/chat/chat.module';
import { IReviewRepository } from './domain/repositories/review.repository.interface';
import { TypeOrmReviewRepository } from './infrastructure/persistence/typeorm-review.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ProfileExpert, ChatSession]),
    ExpertModule,
    ChatModule,
  ],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    {
      provide: IReviewRepository,
      useClass: TypeOrmReviewRepository,
    },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule { }
