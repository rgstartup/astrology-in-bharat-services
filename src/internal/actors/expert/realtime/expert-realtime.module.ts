import { Module } from '@nestjs/common';
import { PresenceModule } from '../presence/presence.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { ExpertRealtimeAuthVerifier } from './expert-realtime-auth.verifier';
import { ExpertRealtimeService } from './expert-realtime.service';
import { ExpertPresenceHandler } from './handlers/expert-presence.handler';
import { ExpertNotificationHandler } from './handlers/expert-notification.handler';
import { ExpertChatHandler } from './handlers/expert-chat.handler';
import { ExpertCallHandler } from './handlers/expert-call.handler';

@Module({
  imports: [PresenceModule, ConsultationRoomModule],
  providers: [
    ExpertRealtimeAuthVerifier,
    ExpertRealtimeService,
    ExpertPresenceHandler,
    ExpertNotificationHandler,
    ExpertChatHandler,
    ExpertCallHandler,
  ],
  exports: [ExpertRealtimeAuthVerifier, ExpertRealtimeService],
})
export class ExpertRealtimeModule {}
