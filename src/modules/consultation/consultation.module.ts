import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationController } from './consultation/controllers/consultation.controller';
import { GetUnifiedHistoryUseCase } from './consultation/use-cases/get-unified-history.use-case';
import { ChatSession } from './chat/entities/chat-session.entity';
import { CallSession } from './call/entities/call-session.entity';
import { Review } from '@/modules/consultation/reviews/entities/review.entity';
import { CallModule } from './call/call.module';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, CallSession, Review]),
    forwardRef(() => ChatModule),
    forwardRef(() => CallModule),
    forwardRef(() => ReviewsModule),
  ],
  controllers: [ConsultationController],
  providers: [GetUnifiedHistoryUseCase],
  exports: [ChatModule, CallModule, ReviewsModule],
})
export class ConsultationModule {}
