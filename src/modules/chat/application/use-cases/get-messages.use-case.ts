import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../infrastructure/entities/chat-message.entity';

@Injectable()
export class GetMessagesUseCase {
    constructor(
        @InjectRepository(ChatMessage)
        private messageRepo: Repository<ChatMessage>,
    ) { }

    async execute(sessionId: number) {
        return this.messageRepo.find({
            where: { session_id: sessionId },
            order: { created_at: 'ASC' },
        });
    }
}
