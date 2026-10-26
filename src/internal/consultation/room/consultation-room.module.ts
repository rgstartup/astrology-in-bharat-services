import { Module } from '@nestjs/common';
import { ConsultationRoomRepository } from './consultation-room.repository';
import { MarkConsultationSessionStartedUseCase } from './mark-consultation-session-started.use-case';
import { ResolveConsultationBudgetUseCase } from './resolve-consultation-budget.use-case';
import { PromotionsModule } from '@/internal/promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  providers: [
    ConsultationRoomRepository,
    MarkConsultationSessionStartedUseCase,
    ResolveConsultationBudgetUseCase,
  ],
  exports: [ConsultationRoomRepository, MarkConsultationSessionStartedUseCase, ResolveConsultationBudgetUseCase],
})
export class ConsultationRoomModule {}
