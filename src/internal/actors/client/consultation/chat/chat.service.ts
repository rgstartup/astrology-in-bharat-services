import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { CheckChatEligibilityUsecase } from './use-cases/check-chat-eligibility.usecase';
import { InitiateChatUsecase } from './use-cases/initiate-chat.usecase';
import { ChatEligibilityResponseDto } from './dto/chat-eligibility-response.dto';

@Injectable()
export class ClientChatService {
  constructor(
    private readonly checkChatEligibilityUsecase: CheckChatEligibilityUsecase,
    private readonly initiateChatUsecase: InitiateChatUsecase,
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

  /** Expiry still runs through the legacy service until it migrates. */
  expireSession(sessionId: number) {
    return this.legacyChatService.expireSession(sessionId);
  }
}
