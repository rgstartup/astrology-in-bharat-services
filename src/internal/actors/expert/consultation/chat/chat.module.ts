import { Module } from '@nestjs/common';
import { RealtimeModule } from '@/internal/realtime/realtime.module';
import { ExpertChatService } from './chat.service';
import { ExpertChatController } from './controllers/chat.controller';
import { SendChatAttachmentUseCase } from './use-cases/send-chat-attachment.usecase';

@Module({
  imports: [RealtimeModule],
  controllers: [ExpertChatController],
  providers: [ExpertChatService, SendChatAttachmentUseCase],
  exports: [ExpertChatService],
})
export class ExpertChatModule {}
