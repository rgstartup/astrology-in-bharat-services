import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationController } from './consultation/controllers/consultation.controller';
import { ConsultationTopicController } from './consultation/controllers/consultation-topic.controller';
import { GetUnifiedHistoryUseCase } from './consultation/use-cases/get-unified-history.use-case';
import { GetConsultationTopicsUseCase } from './consultation/use-cases/get-consultation-topics.use-case';
import { ChatSession } from './chat/entities/chat-session.entity';
import { CallSession } from './call/entities/call-session.entity';
import { Review } from '@/modules/consultation/reviews/entities/review.entity';
import { ConsultationTopic } from './consultation/entities/consultation_topic.entity';
import { ConsultationTopicPreference } from './consultation/entities/consultation_topic_preference.entity';
import { CallModule } from './call/call.module';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatSession,
      CallSession,
      Review,
      ConsultationTopic,
      ConsultationTopicPreference,
    ]),
    forwardRef(() => ChatModule),
    forwardRef(() => CallModule),
    forwardRef(() => ReviewsModule),
  ],
  controllers: [ConsultationController, ConsultationTopicController],
  providers: [GetUnifiedHistoryUseCase, GetConsultationTopicsUseCase],
  exports: [
    ChatModule,
    CallModule,
    ReviewsModule,
    GetConsultationTopicsUseCase,
  ],
})
export class ConsultationModule {}
