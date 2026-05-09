import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, MessageType } from '../../infrastructure/entities/chat-message.entity';

@Injectable()
export class SaveMessageUseCase {
    constructor(
        @InjectRepository(ChatMessage)
        private messageRepo: Repository<ChatMessage>,
    ) { }

    async execute(
        sessionId: number,
        senderId: number,
        senderType: 'user' | 'expert',
        content: string,
        type: MessageType = MessageType.TEXT,
    ) {
        const message = this.messageRepo.create({
            session_id: sessionId,
            sender_id: senderId,
            sender_type: senderType,
            content,
            type,
        });

        return this.messageRepo.save(message);
    }
}
