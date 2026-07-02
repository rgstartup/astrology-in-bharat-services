import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatMessage,
  MessageType,
} from '../../infrastructure/entities/chat-message.entity';

@Injectable()
export class SaveMessageUseCase {
  constructor(
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
  ) {}

  async execute(
    sessionId: string,
    senderId: string,
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
