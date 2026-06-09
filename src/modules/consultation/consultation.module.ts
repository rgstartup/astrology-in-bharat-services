import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationController } from './consultation/api/controllers/consultation.controller';
import { GetUnifiedHistoryUseCase } from './consultation/application/use-cases/get-unified-history.use-case';
import { ChatSession } from './chat/infrastructure/entities/chat-session.entity';
import { CallSession } from './call/infrastructure/entities/call-session.entity';
import { Review } from '@/modules/consultation/reviews/infrastructure/entities/review.entity';
import { CallModule } from './call/call.module';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, CallSession, Review, ProfileClient]),
    forwardRef(() => ChatModule),
    forwardRef(() => CallModule),
    forwardRef(() => ReviewsModule),
    forwardRef(() => ExpertProfileModule),
  ],
  controllers: [ConsultationController],
  providers: [GetUnifiedHistoryUseCase],
  exports: [ChatModule, CallModule, ReviewsModule],
})
export class ConsultationModule {}
