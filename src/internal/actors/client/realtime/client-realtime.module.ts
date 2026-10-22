import { Module } from '@nestjs/common';
import { PresenceModule } from '@/internal/actors/expert/presence/presence.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { ConsultationOrchestratorModule } from '@/internal/consultation/orchestrator/consultation-orchestrator.module';
import { ClientRealtimeAuthVerifier } from './client-realtime-auth.verifier';
import { ClientRealtimeService } from './client-realtime.service';
import { ClientPresenceHandler } from './handlers/client-presence.handler';
import { ClientNotificationHandler } from './handlers/client-notification.handler';
import { ClientChatHandler } from './handlers/client-chat.handler';
import { VoiceModule } from '@/external/voice';

@Module({
  imports: [
    PresenceModule,
    ConsultationRoomModule,
    ConsultationOrchestratorModule,
    VoiceModule,
  ],
  providers: [
    ClientRealtimeAuthVerifier,
    ClientRealtimeService,
    ClientPresenceHandler,
    ClientNotificationHandler,
    ClientChatHandler,
  ],
  exports: [ClientRealtimeAuthVerifier, ClientRealtimeService],
})
export class ClientRealtimeModule {}
