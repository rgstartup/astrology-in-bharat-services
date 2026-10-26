import { Module } from '@nestjs/common';
import { ClientRealtimeModule } from '@/internal/actors/client/realtime/client-realtime.module';
import { ClientRealtimeAuthVerifier } from '@/internal/actors/client/realtime/client-realtime-auth.verifier';
import { ExpertRealtimeModule } from '@/internal/actors/expert/realtime/expert-realtime.module';
import { ExpertRealtimeAuthVerifier } from '@/internal/actors/expert/realtime/expert-realtime-auth.verifier';
import { REALTIME_AUTH_VERIFIERS } from './contracts/realtime-auth-verifier.contract';
import { RealtimeAuthService } from './services/realtime-auth.service';
import { RealtimeGateway } from './realtime.gateway';
import { ConsultationOrchestratorModule } from '@/internal/consultation/orchestrator/consultation-orchestrator.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { VoiceModule } from '@/external/voice';
import { RealtimeChatModule } from './chat/realtime-chat.module';
import {
  ChatGateway,
  ConsultationGateway,
  NotificationGateway,
  PresenceGateway,
} from './gateways';
import { ConsultationEndedHandler } from './events/consultation-ended.handler';

@Module({
  imports: [
    ClientRealtimeModule,
    ExpertRealtimeModule,
    ConsultationOrchestratorModule,
    ConsultationRoomModule,
    VoiceModule,
    RealtimeChatModule,
  ],
  providers: [
    {
      provide: REALTIME_AUTH_VERIFIERS,
      useFactory: (
        clientVerifier: ClientRealtimeAuthVerifier,
        expertVerifier: ExpertRealtimeAuthVerifier,
      ) => [clientVerifier, expertVerifier],
      inject: [ClientRealtimeAuthVerifier, ExpertRealtimeAuthVerifier],
    },
    RealtimeAuthService,
    RealtimeGateway,
    ConsultationGateway,
    NotificationGateway,
    PresenceGateway,
    ConsultationEndedHandler,
  ],
  exports: [
    RealtimeGateway,
    ChatGateway,
    ConsultationGateway,
    RealtimeAuthService,
    RealtimeChatModule,
  ],
})
export class RealtimeModule {}
