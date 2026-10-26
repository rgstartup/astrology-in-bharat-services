import { Module } from "@nestjs/common";
import { PresenceModule } from "@/internal/actors/expert/presence/presence.module";
import { ConsultationRoomModule } from "@/internal/consultation/room/consultation-room.module";
import { VoiceModule } from "@/external/voice/voice.module";
import { RealtimeChatModule } from "@/internal/realtime/chat/realtime-chat.module";
import { PromotionsModule } from "@/internal/promotions/promotions.module";
import { ClientChatService } from "./chat/chat.service";
import { ClientVoiceService } from "./voice/voice.service";
import { ClientConsultationService } from "./consultation.service";
import { ClientChatController } from "./chat/controllers/chat.controller";
import { ClientVoiceController } from "./voice/controllers/voice.controller";
import { ClientConsultationController } from "./controllers/consultation.controller";
import { ClientSessionCompatController } from "./controllers/client-session-compat.controller";
import { CheckChatEligibilityUsecase } from "./chat/use-cases/check-chat-eligibility.usecase";
import { GetChatHistoryUseCase } from "./chat/use-cases/get-chat-history.usecase";
import { UploadChatAttachmentUseCase } from "./chat/use-cases/upload-chat-attachment.usecase";
import { CheckVoiceEligibilityUsecase } from "./voice/use-cases/check-voice-eligibility.usecase";import { GetVoiceTokenUsecase } from "./voice/use-cases/get-voice-token.usecase";
import { InitiateConsultationUsecase } from "@/internal/consultation/room/initiate-consultation.usecase";

/**
 * Single client consultation module (chat + voice + unified initiate).
 *
 * Responsibilities:
 * - Own all client consultation HTTP surface through separate
 *   controllers (chat, voice, consultations, compat) sharing one provider set.
 * - Initiation is owned by `InitiateConsultationUsecase` (mode-agnostic);
 *   `InitiateChatUsecase` / `InitiateVoiceUsecase` subclasses removed.
 */
@Module({
  imports: [
    PresenceModule,
    ConsultationRoomModule,
    VoiceModule,
    RealtimeChatModule,
    PromotionsModule,
  ],
  controllers: [
    ClientChatController,
    ClientVoiceController,
    ClientConsultationController,
    ClientSessionCompatController,
  ],
  providers: [
    ClientChatService,
    ClientVoiceService,
    ClientConsultationService,
    CheckChatEligibilityUsecase,
    GetChatHistoryUseCase,
    UploadChatAttachmentUseCase,
    CheckVoiceEligibilityUsecase,
    GetVoiceTokenUsecase,
    InitiateConsultationUsecase,
  ],
  exports: [ClientChatService, ClientVoiceService, ClientConsultationService],
})
export class ClientConsultationModule {}
