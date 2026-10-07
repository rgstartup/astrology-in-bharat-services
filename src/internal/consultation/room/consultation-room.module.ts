import { Module } from '@nestjs/common';
import { ConsultationRoomRepository } from './consultation-room.repository';
import { MarkConsultationSessionStartedUseCase } from './mark-consultation-session-started.use-case';

@Module({
  providers: [
    ConsultationRoomRepository,
    MarkConsultationSessionStartedUseCase,
  ],
  exports: [ConsultationRoomRepository, MarkConsultationSessionStartedUseCase],
})
export class ConsultationRoomModule {}
