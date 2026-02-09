import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSessionMessage } from '../../domain/entities/chat-message.entity';
import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';

@Injectable()
export class TypeOrmChatMessageRepository implements IChatMessageRepository {
    constructor(
        @InjectRepository(LiveSessionMessage)
        private readonly repository: Repository<LiveSessionMessage>,
    ) { }

    create(data: Partial<LiveSessionMessage>): LiveSessionMessage {
        return this.repository.create(data);
    }

    async save(message: LiveSessionMessage): Promise<LiveSessionMessage> {
        return this.repository.save(message);
    }

    async findBySessionId(sessionId: number): Promise<LiveSessionMessage[]> {
        return this.repository.find({ where: { sessionId } as any, order: { timestamp: 'ASC' } as any });
    }
}
