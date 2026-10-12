import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '@/internal/consultation/chat/chat.module';
import { PresenceModule } from '@/internal/actors/expert/presence/presence.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { RealtimeModule } from '@/internal/realtime/realtime.module';
import { ClientChatService } from './chat.service';
import { ClientChatController } from './controllers/chat.controller';
import { CheckChatEligibilityUsecase } from './use-cases/check-chat-eligibility.usecase';
import { GetChatHistoryUseCase } from './use-cases/get-chat-history.usecase';
import { InitiateChatUsecase } from './use-cases/initiate-chat.usecase';
import { UploadChatAttachmentUseCase } from './use-cases/upload-chat-attachment.usecase';
import { StorageModule } from '@/external/storage';

@Module({
  imports: [
    forwardRef(() => ChatModule),
    PresenceModule,
    ConsultationRoomModule,
    StorageModule,
    RealtimeModule,
  ],
  controllers: [ClientChatController],
  providers: [
    ClientChatService,
    CheckChatEligibilityUsecase,
    GetChatHistoryUseCase,
    InitiateChatUsecase,
    UploadChatAttachmentUseCase,
  ],
  exports: [ClientChatService],
})
export class ClientChatModule {}
