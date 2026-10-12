import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { MessageType } from '../enum';

/**
 * @deprecated Legacy TypeORM message persistence. Replaced by Drizzle `persistChatMessage()` under `internal/realtime/chat`.
 */
@Injectable()
export class SaveMessageUseCase {
  constructor(
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
  ) {}

  async execute(
    sessionId: number,
    senderId: number,
    senderType: 'user' | 'expert',
    content: string,
    type: MessageType = MessageType.TEXT,
    attachmentUrl?: string,
    attachmentType?: string,
  ) {
    const message = this.messageRepo.create({
      session_id: sessionId,
      sender_id: senderId,
      sender_type: senderType,
      content,
      type,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
    });

    return this.messageRepo.save(message);
  }
}
