import { Module } from '@nestjs/common';
import { PresenceModule } from '@/internal/actors/expert/presence/presence.module';
import { VoiceModule } from '@/external/voice';
import { ConsultationRoomModule } from '../room/consultation-room.module';
import { ConsultationBudgetEngine } from './consultation-budget.engine';
import { ConsultationOrchestratorService } from './consultation-orchestrator.service';
import { ChatModeAdapter } from './adapters/chat-mode.adapter';
import { VoiceModeAdapter } from './adapters/voice-mode.adapter';
import { VideoModeAdapter } from './adapters/video-mode.adapter';
import {
  AcceptConsultationUseCase,
  CancelConsultationUseCase,
  EndConsultationUseCase,
  GetConsultationStatusUseCase,
  PauseConsultationUseCase,
  RejectConsultationUseCase,
  RequestConsultationUseCase,
  ResumeConsultationUseCase,
  StartConsultationUseCase,
  SwitchToChatUseCase,
  TriggerBudgetHoldUseCase,
} from './use-cases';

const USE_CASES = [
  AcceptConsultationUseCase,
  RejectConsultationUseCase,
  RequestConsultationUseCase,
  CancelConsultationUseCase,
  StartConsultationUseCase,
  PauseConsultationUseCase,
  ResumeConsultationUseCase,
  EndConsultationUseCase,
  GetConsultationStatusUseCase,
  TriggerBudgetHoldUseCase,
  SwitchToChatUseCase,
];

@Module({
  imports: [ConsultationRoomModule, PresenceModule, VoiceModule],
  providers: [
    ConsultationBudgetEngine,
    ConsultationOrchestratorService,
    ChatModeAdapter,
    VoiceModeAdapter,
    VideoModeAdapter,
    ...USE_CASES,
  ],
  exports: [
    ConsultationBudgetEngine,
    ConsultationOrchestratorService,
    ChatModeAdapter,
    VoiceModeAdapter,
    VideoModeAdapter,
    ...USE_CASES,
  ],
})
export class ConsultationOrchestratorModule {}
