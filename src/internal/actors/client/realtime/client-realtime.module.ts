import { Module } from '@nestjs/common';
import { PresenceModule } from '@/internal/actors/expert/presence/presence.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { ClientRealtimeAuthVerifier } from './client-realtime-auth.verifier';
import { ClientRealtimeService } from './client-realtime.service';
import { ClientPresenceHandler } from './handlers/client-presence.handler';
import { ClientNotificationHandler } from './handlers/client-notification.handler';
import { ClientChatHandler } from './handlers/client-chat.handler';
import { ClientCallHandler } from './handlers/client-call.handler';

@Module({
  imports: [PresenceModule, ConsultationRoomModule],
  providers: [
    ClientRealtimeAuthVerifier,
    ClientRealtimeService,
    ClientPresenceHandler,
    ClientNotificationHandler,
    ClientChatHandler,
    ClientCallHandler,
  ],
  exports: [ClientRealtimeAuthVerifier, ClientRealtimeService],
})
export class ClientRealtimeModule {}
