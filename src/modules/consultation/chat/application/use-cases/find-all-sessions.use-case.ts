import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../infrastructure/entities/chat-message.entity';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class FindAllSessionsUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
    ) { }

    async execute(filter?: string, page: number = 1, limit: number = 10) {
        const query = this.sessionRepo.createQueryBuilder('session')
            .leftJoinAndSelect('session.client', 'client')
            .leftJoinAndSelect('client.user', 'user')
            .leftJoinAndSelect('session.expert', 'expert')
            .leftJoinAndSelect('expert.user', 'expertUser')
            .addSelect((subQuery) => {
                return subQuery
                    .select('COUNT(message.id)', 'count')
                    .from(ChatMessage, 'message')
                    .where('message.session_id = session.id');
            }, 'message_count')
            .orderBy('session.created_at', 'DESC');

        if (filter === 'chat_live') {
            query.andWhere('session.status = :status', { status: ChatSessionStatus.ACTIVE });
        } else if (filter === 'expired') {
            query.andWhere('session.status IN (:...statuses)', {
                statuses: [ChatSessionStatus.EXPIRED, ChatSessionStatus.COMPLETED]
            });
        } else if (filter === 'admin_terminated') {
            query.andWhere('session.status = :status', { status: ChatSessionStatus.COMPLETED })
                .andWhere('session.terminated_by = :terminatedBy', { terminatedBy: 'admin' });
        }

        const total = await query.getCount();

        const { entities, raw } = await query
            .offset((page - 1) * limit)
            .limit(limit)
            .getRawAndEntities();

        const items = entities.map((entity, index) => ({
            ...entity,
            message_count: parseInt(raw[index].message_count, 10) || 0,
        }));

        return { items, total };
    }

}
