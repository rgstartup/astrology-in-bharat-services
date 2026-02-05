import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';

@Injectable()
export class TypeOrmChatMessageRepository implements IChatMessageRepository {
    constructor(
        @InjectRepository(ChatMessage)
        private readonly repository: Repository<ChatMessage>,
    ) { }

    async find(options: any): Promise<ChatMessage[]> {
        return this.repository.find(options);
    }

    async save(message: ChatMessage): Promise<ChatMessage> {
        return this.repository.save(message);
    }

    create(data: Partial<ChatMessage>): ChatMessage {
        return this.repository.create(data);
    }
}
