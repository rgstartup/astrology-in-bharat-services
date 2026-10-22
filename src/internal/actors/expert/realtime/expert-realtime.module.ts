import { Module } from '@nestjs/common';
import { PresenceModule } from '../presence/presence.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { ConsultationOrchestratorModule } from '@/internal/consultation/orchestrator/consultation-orchestrator.module';
import { ExpertRealtimeAuthVerifier } from './expert-realtime-auth.verifier';
import { ExpertRealtimeService } from './expert-realtime.service';
import { ExpertPresenceHandler } from './handlers/expert-presence.handler';
import { ExpertNotificationHandler } from './handlers/expert-notification.handler';
import { ExpertChatHandler } from './handlers/expert-chat.handler';
import { VoiceModule } from '@/external/voice';

@Module({
  imports: [
    PresenceModule,
    ConsultationRoomModule,
    ConsultationOrchestratorModule,
    VoiceModule,
  ],
  providers: [
    ExpertRealtimeAuthVerifier,
    ExpertRealtimeService,
    ExpertPresenceHandler,
    ExpertNotificationHandler,
    ExpertChatHandler,
  ],
  exports: [ExpertRealtimeAuthVerifier, ExpertRealtimeService],
})
export class ExpertRealtimeModule {}
