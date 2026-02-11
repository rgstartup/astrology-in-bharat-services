import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ChatSession } from '@/modules/chat/domain/entities/chat-session.entity';
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

    async findAllWithFilters(type?: string): Promise<any[]> {
        const query = this.repository.createQueryBuilder('session')
            .leftJoinAndSelect('session.user', 'user')
            .leftJoinAndSelect('session.expert', 'expert')
            .leftJoinAndSelect('expert.user', 'expertUser')
            .loadRelationCountAndMap('session.messageCount', 'session.messages')
            .orderBy('session.createdAt', 'DESC');

        if (type === 'expired') {
            query.where('session.status = :status', { status: 'expired' });
        } else if (type === 'admin_terminated') {
            query.where('session.status = :status AND session.terminatedBy = :terminatedBy', { status: 'completed', terminatedBy: 'admin' });
        } else if (type === 'chat_live') {
            query.where('session.status = :status AND session.sessionType = :sessionType', { status: 'active', sessionType: 'chat' });
        } else {
            query.where('session.status IN (:...statuses)', { statuses: ['active', 'pending'] });
        }

        return query.getMany();
    }
}
