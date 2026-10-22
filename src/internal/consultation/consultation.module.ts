import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationController } from './consultation/controllers/consultation.controller';
import { ConsultationTopicController } from './consultation/controllers/consultation-topic.controller';
import { GetUnifiedHistoryUseCase } from './consultation/use-cases/get-unified-history.use-case';
import { GetConsultationTopicsUseCase } from './consultation/use-cases/get-consultation-topics.use-case';
import { Review } from './reviews/entities/review.entity';
import { ConsultationTopic } from './consultation/entities/consultation_topic.entity';
import { ReviewsModule } from './reviews/reviews.module';
import { ConsultationOrchestratorModule } from './orchestrator/consultation-orchestrator.module';

/**
 * Module organizing consultation aggregate, topics, and history endpoints.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ConsultationTopic]),
    forwardRef(() => ReviewsModule),
    ConsultationOrchestratorModule,
  ],
  controllers: [ConsultationController, ConsultationTopicController],
  providers: [GetUnifiedHistoryUseCase, GetConsultationTopicsUseCase],
  exports: [
    ReviewsModule,
    GetConsultationTopicsUseCase,
    ConsultationOrchestratorModule,
  ],
})
export class ConsultationModule {}
