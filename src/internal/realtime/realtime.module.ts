import { Module } from '@nestjs/common';
import { ClientRealtimeModule } from '@/internal/actors/client/realtime/client-realtime.module';
import { ClientRealtimeAuthVerifier } from '@/internal/actors/client/realtime/client-realtime-auth.verifier';
import { ExpertRealtimeModule } from '@/internal/actors/expert/realtime/expert-realtime.module';
import { ExpertRealtimeAuthVerifier } from '@/internal/actors/expert/realtime/expert-realtime-auth.verifier';
import { REALTIME_AUTH_VERIFIERS } from './contracts/realtime-auth-verifier.contract';
import { RealtimeAuthService } from './services/realtime-auth.service';
import { RealtimeGateway } from './realtime.gateway';
import { ChatRequestExpiryCron } from './chat-request-expiry.cron';
import {
  RealtimeCallGateway,
  RealtimeChatGateway,
  RealtimeNotificationGateway,
  RealtimePresenceGateway,
} from './gateways';

@Module({
  imports: [ClientRealtimeModule, ExpertRealtimeModule],
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
    RealtimeChatGateway,
    ChatRequestExpiryCron,
    RealtimeCallGateway,
    RealtimeNotificationGateway,
    RealtimePresenceGateway,
  ],
  exports: [RealtimeGateway, RealtimeAuthService],
})
export class RealtimeModule {}
