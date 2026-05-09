import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationController } from './api/controllers/consultation.controller';
import { GetUnifiedHistoryUseCase } from './application/use-cases/get-unified-history.use-case';
import { ChatSession } from '@/modules/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/entities/call-session.entity';
import { Review } from '@/modules/reviews/infrastructure/entities/review.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ChatModule } from '@/modules/chat/chat.module';
import { CallModule } from '@/modules/call/call.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, CallSession, Review, ProfileExpert]),
    ChatModule,
    CallModule,
  ],
  controllers: [ConsultationController],
  providers: [GetUnifiedHistoryUseCase],
})
export class ConsultationModule {}
