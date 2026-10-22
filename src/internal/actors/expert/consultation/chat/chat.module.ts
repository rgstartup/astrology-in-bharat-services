import { Module } from '@nestjs/common';
import { RealtimeModule } from '@/internal/realtime/realtime.module';
import { ExpertChatService } from './chat.service';
import { ExpertChatController } from './controllers/chat.controller';
import { ExpertAppointmentsCompatController } from './controllers/expert-appointments-compat.controller';
import { SendChatAttachmentUseCase } from './use-cases/send-chat-attachment.usecase';

/**
 * Module organizing expert consultation chat features and legacy compatibility endpoints.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [ExpertChatController, ExpertAppointmentsCompatController],
  providers: [ExpertChatService, SendChatAttachmentUseCase],
  exports: [ExpertChatService],
})
export class ExpertChatModule {}
