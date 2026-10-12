import { Injectable } from '@nestjs/common';
import {
  ChatAttachmentMessageService,
  type ChatAttachmentMessagePayload,
} from '@/internal/realtime/chat/chat-attachment-message.service';
import { ExpertChatAttachmentResponseDto } from '../dto/chat-attachment-response.dto';

/**
 * Expert attachment send — mirrors the client flow through the shared
 * service (storage → message + media + link transaction → `chat:message`
 * room emit). Differs only in guard and `senderType`.
 */
@Injectable()
export class SendChatAttachmentUseCase {
  constructor(
    private readonly attachmentMessages: ChatAttachmentMessageService,
  ) {}

  async execute(
    expertId: number,
    consultationId: number,
    file: Express.Multer.File | undefined,
    content?: string,
    idempotencyKey?: string,
  ): Promise<ExpertChatAttachmentResponseDto> {
    const payload: ChatAttachmentMessagePayload =
      await this.attachmentMessages.sendWithAttachment({
        actorType: 'expert',
        actorId: expertId,
        consultationId,
        content,
        file,
        idempotencyKey,
      });
    return { ...payload };
  }
}
