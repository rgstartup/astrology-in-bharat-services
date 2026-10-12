import { Injectable } from '@nestjs/common';
import {
  ChatAttachmentMessageService,
  type ChatAttachmentMessagePayload,
} from '@/internal/realtime/chat/chat-attachment-message.service';
import { ChatAttachmentResponseDto } from '../dto/chat-attachment-response.dto';

/**
 * Client attachment send: single HTTP call carrying the file, the message
 * text, and the idempotency key. The shared service stores the upload,
 * persists message + media + link in one transaction, and emits
 * `chat:message` to the room — no socket `chat:send` needed.
 */
@Injectable()
export class UploadChatAttachmentUseCase {
  constructor(
    private readonly attachmentMessages: ChatAttachmentMessageService,
  ) {}

  async execute(
    clientId: number,
    consultationId: number,
    file: Express.Multer.File | undefined,
    content?: string,
    idempotencyKey?: string,
  ): Promise<ChatAttachmentResponseDto> {
    const payload: ChatAttachmentMessagePayload =
      await this.attachmentMessages.sendWithAttachment({
        actorType: 'client',
        actorId: clientId,
        consultationId,
        content,
        file,
        idempotencyKey,
      });
    return { ...payload };
  }
}
