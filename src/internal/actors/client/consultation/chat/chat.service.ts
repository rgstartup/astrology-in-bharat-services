import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { CheckChatEligibilityUsecase } from './use-cases/check-chat-eligibility.usecase';
import { GetChatHistoryUseCase } from './use-cases/get-chat-history.usecase';
import { InitiateChatUsecase } from './use-cases/initiate-chat.usecase';
import { UploadChatAttachmentUseCase } from './use-cases/upload-chat-attachment.usecase';
import { ChatEligibilityResponseDto } from './dto/chat-eligibility-response.dto';
import { ChatAttachmentResponseDto } from './dto/chat-attachment-response.dto';
import { ChatHistoryResponseDto } from './dto/chat-history-response.dto';

@Injectable()
export class ClientChatService {
  constructor(
    private readonly checkChatEligibilityUsecase: CheckChatEligibilityUsecase,
    private readonly getChatHistoryUsecase: GetChatHistoryUseCase,
    private readonly initiateChatUsecase: InitiateChatUsecase,
    private readonly uploadChatAttachmentUsecase: UploadChatAttachmentUseCase,
    @Inject(forwardRef(() => ChatService))
    private readonly legacyChatService: ChatService,
  ) {}

  checkEligibility(
    clientId: number,
    expertId: number,
  ): Promise<ChatEligibilityResponseDto> {
    return this.checkChatEligibilityUsecase.execute(clientId, expertId);
  }

  initiateChat(userId: number, expert_id: number, consultation_id?: number) {
    return this.initiateChatUsecase.execute(userId, expert_id, consultation_id);
  }

  getChatHistory(
    clientId: number,
    consultationId: number,
  ): Promise<ChatHistoryResponseDto> {
    return this.getChatHistoryUsecase.execute(clientId, consultationId);
  }

  uploadAttachment(
    clientId: number,
    consultationId: number,
    file: Express.Multer.File | undefined,
    content?: string,
    idempotencyKey?: string,
  ): Promise<ChatAttachmentResponseDto> {
    return this.uploadChatAttachmentUsecase.execute(
      clientId,
      consultationId,
      file,
      content,
      idempotencyKey,
    );
  }

  /** Expiry still runs through the legacy service until it migrates. */
  expireSession(sessionId: number) {
    return this.legacyChatService.expireSession(sessionId);
  }
}
