import { Module } from '@nestjs/common';
import { ConsultationRoomRepository } from './consultation-room.repository';
import { MarkConsultationSessionStartedUseCase } from './mark-consultation-session-started.use-case';
import { ResolveConsultationBudgetUseCase } from './resolve-consultation-budget.use-case';

@Module({
  providers: [
    ConsultationRoomRepository,
    MarkConsultationSessionStartedUseCase,
    ResolveConsultationBudgetUseCase,
  ],
  exports: [ConsultationRoomRepository, MarkConsultationSessionStartedUseCase, ResolveConsultationBudgetUseCase],
})
export class ConsultationRoomModule {}
