import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from '@/modules/chat/chat.module';
import { ChatSession } from '@/modules/chat/domain/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { ExpertModule } from '@/modules/expert/expert.module';
import { ReviewsService } from './application/services/reviews.service';
import { Review } from './domain/entities/review.entity';
import { IReviewRepository } from './domain/repositories/review.repository.interface';
import { TypeOrmReviewRepository } from './infrastructure/persistence/typeorm-review.repository';
import { ReviewsController } from './interfaces/controllers/reviews.controller';

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
