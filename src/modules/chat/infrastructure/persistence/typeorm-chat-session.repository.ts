import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ChatSession } from '../../domain/entities/chat-session.entity';
import { IChatSessionRepository } from '../../domain/repositories/chat-session.repository.interface';

@Injectable()
export class TypeOrmChatSessionRepository implements IChatSessionRepository {
    constructor(
        @InjectRepository(ChatSession)
        private readonly repository: Repository<ChatSession>,
    ) { }

    async findOne(options: any): Promise<ChatSession | null> {
        return this.repository.findOne(options);
    }

    async find(options: any): Promise<ChatSession[]> {
        return this.repository.find(options);
    }

    async save(session: ChatSession): Promise<ChatSession> {
        return this.repository.save(session);
    }

    create(data: Partial<ChatSession>): ChatSession {
        return this.repository.create(data);
    }

    async count(options?: any): Promise<number> {
        return this.repository.count(options);
    }
}
