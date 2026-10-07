import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '@/internal/consultation/chat/chat.module';
import { PresenceModule } from '@/internal/actors/expert/presence/presence.module';
import { ConsultationRoomModule } from '@/internal/consultation/room/consultation-room.module';
import { ClientChatService } from './chat.service';
import { ClientChatController } from './controllers/chat.controller';
import { CheckChatEligibilityUsecase } from './use-cases/check-chat-eligibility.usecase';
import { InitiateChatUsecase } from './use-cases/initiate-chat.usecase';

@Module({
  imports: [
    forwardRef(() => ChatModule),
    PresenceModule,
    ConsultationRoomModule,
  ],
  controllers: [ClientChatController],
  providers: [
    ClientChatService,
    CheckChatEligibilityUsecase,
    InitiateChatUsecase,
  ],
  exports: [ClientChatService],
})
export class ClientChatModule {}
