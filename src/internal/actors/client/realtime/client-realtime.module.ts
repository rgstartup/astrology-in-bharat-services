import { Module } from '@nestjs/common';
import { ClientRealtimeAuthVerifier } from './client-realtime-auth.verifier';
import { ClientRealtimeService } from './client-realtime.service';
import { ClientPresenceHandler } from './handlers/client-presence.handler';
import { ClientNotificationHandler } from './handlers/client-notification.handler';
import { ClientChatHandler } from './handlers/client-chat.handler';
import { ClientCallHandler } from './handlers/client-call.handler';

@Module({
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
