import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Brackets } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

export enum ExpertSessionFilter {
    PENDING = 'pending',
    COMPLETED = 'completed',
    RECENT_PENDING = 'recent_pending',
    RECENT_COMPLETED = 'recent_completed',
    ALL = 'all',
}

export interface FindExpertSessionsOptions {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

@Injectable()
export class FindExpertSessionsUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
    ) { }

    async execute(userId: number, filter: ExpertSessionFilter, options: FindExpertSessionsOptions = {}) {
        const expert = await this.expertRepo.findOne({
            where: { user: { id: userId } },
        });
        if (!expert) return { data: [], totalCount: 0 };

        const expertId = expert.id;
        const { limit = 20, offset = 0, search, sortBy = 'created_at', order = 'DESC' } = options;

        const query = this.sessionRepo.createQueryBuilder('session')
            .leftJoinAndSelect('session.user', 'user')
            .leftJoinAndSelect('user.profile_client', 'profile_client')
            .where('session.expert_id = :expertId', { expertId });

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

        switch (filter) {
            case ExpertSessionFilter.PENDING:
                query.andWhere(new Brackets(qb => {
                    qb.where('session.status = :pending', { pending: ChatSessionStatus.PENDING })
                        .orWhere('session.status = :active', { active: ChatSessionStatus.ACTIVE })
                        .orWhere('(session.status = :completed AND session.created_at > :oneHourAgo)', { completed: ChatSessionStatus.COMPLETED, oneHourAgo })
                        .orWhere('(session.status = :expired AND session.created_at > :oneHourAgo)', { expired: ChatSessionStatus.EXPIRED, oneHourAgo });
                }));
                break;

            case ExpertSessionFilter.RECENT_PENDING:
                query.andWhere('session.created_at > :twelveHoursAgo', { twelveHoursAgo })
                    .andWhere('session.status IN (:...statuses)', {
                        statuses: [
                            ChatSessionStatus.PENDING,
                            ChatSessionStatus.ACTIVE,
                            ChatSessionStatus.COMPLETED,
                            ChatSessionStatus.EXPIRED
                        ]
                    });
                break;

            case ExpertSessionFilter.COMPLETED:
                query.andWhere('session.status IN (:...statuses)', {
                    statuses: [
                        ChatSessionStatus.COMPLETED,
                        ChatSessionStatus.EXPIRED,
                        ChatSessionStatus.CANCELLED
                    ]
                });
                break;

            case ExpertSessionFilter.RECENT_COMPLETED:
                query.andWhere('session.created_at > :twelveHoursAgo', { twelveHoursAgo })
                    .andWhere('session.status IN (:...statuses)', {
                        statuses: [
                            ChatSessionStatus.COMPLETED,
                            ChatSessionStatus.EXPIRED,
                            ChatSessionStatus.CANCELLED
                        ]
                    });
                break;

            case ExpertSessionFilter.ALL:
                // No additional status filter
                break;
        }

        if (search) {
            query.andWhere(new Brackets(qb => {
                qb.where('CAST(session.id AS TEXT) LIKE :search', { search: `%${search}%` })
                    .orWhere('user.name ILIKE :search', { search: `%${search}%` })
                    .orWhere('user.email ILIKE :search', { search: `%${search}%` });
            }));
        }

        // Handle dynamic sorting
        const allowedSortFields = ['created_at', 'total_cost', 'start_time', 'end_time', 'status'];
        const sortField = allowedSortFields.includes(sortBy) ? `session.${sortBy}` : 'session.created_at';
        
        const finalOrder = (order?.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        query.orderBy(sortField, finalOrder);

        query.take(limit).skip(offset);

        const [data, totalCount] = await query.getManyAndCount();

        return { data, totalCount };
    }
}
