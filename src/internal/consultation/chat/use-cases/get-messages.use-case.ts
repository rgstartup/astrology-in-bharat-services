/**
 * @deprecated
 * chat messages are now managed in the consultation_messages table
 * in other words chat message and consultation message is same
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';

@Injectable()
export class GetMessagesUseCase {
  constructor(
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
  ) {}

  /**
   * @deprecated
   * chat messages are now managed in the consultation_messages table
   * in other words chat message and consultation message is same
   */
  async execute(sessionId: number) {
    return this.messageRepo.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
    });
  }
}
