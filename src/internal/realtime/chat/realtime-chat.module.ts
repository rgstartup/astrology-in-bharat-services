import { Module } from '@nestjs/common';
import { StorageModule } from '@/external/storage';
import { ConsultationOrchestratorModule } from '@/internal/consultation/orchestrator/consultation-orchestrator.module';
import { ClientRealtimeModule } from '@/internal/actors/client/realtime/client-realtime.module';
import { ExpertRealtimeModule } from '@/internal/actors/expert/realtime/expert-realtime.module';
import { ChatGateway } from '../gateways/chat.gateway';
import { ChatAttachmentMessageService } from './chat-attachment-message.service';
import { ChatRequestExpiryCron } from './chat-request-expiry.cron';

/**
 * Chat module inside the realtime domain.
 * Encapsulates the Socket.IO realtime chat gateway, attachment handling,
 * request timers, session settlements, and expiry cron jobs.
 */
@Module({
  imports: [
    StorageModule,
    ConsultationOrchestratorModule,
    ClientRealtimeModule,
    ExpertRealtimeModule,
  ],
  providers: [
    ChatGateway,
    ChatAttachmentMessageService,
    ChatRequestExpiryCron,
  ],
  exports: [ChatGateway, ChatAttachmentMessageService],
})
export class RealtimeChatModule {}
