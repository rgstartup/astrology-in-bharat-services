import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

export enum ExpertSessionFilter {
    PENDING = 'pending',
    COMPLETED = 'completed',
    RECENT_PENDING = 'recent_pending',
    RECENT_COMPLETED = 'recent_completed',
    ALL = 'all',
}

@Injectable()
export class FindExpertSessionsUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
    ) { }

    async execute(userId: number, filter: ExpertSessionFilter) {
        const expert = await this.expertRepo.findOne({
            where: { user: { id: userId } },
        });
        if (!expert) return [];

        const expertId = expert.id;
        const now = Date.now();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);

        switch (filter) {
            case ExpertSessionFilter.PENDING:
                return this.sessionRepo.find({
                    where: [
                        { expert_id: expertId, status: ChatSessionStatus.PENDING },
                        { expert_id: expertId, status: ChatSessionStatus.ACTIVE },
                        {
                            expert_id: expertId,
                            status: ChatSessionStatus.COMPLETED,
                            created_at: MoreThan(oneHourAgo),
                        },
                        {
                            expert_id: expertId,
                            status: ChatSessionStatus.EXPIRED,
                            created_at: MoreThan(oneHourAgo),
                        },
                    ],
                    relations: ['user'],
                    order: { created_at: 'DESC' },
                });

            case ExpertSessionFilter.RECENT_PENDING:
                return this.sessionRepo.find({
                    where: [
                        { expert_id: expertId, status: ChatSessionStatus.PENDING, created_at: MoreThan(twelveHoursAgo) },
                        { expert_id: expertId, status: ChatSessionStatus.ACTIVE, created_at: MoreThan(twelveHoursAgo) },
                        { expert_id: expertId, status: ChatSessionStatus.COMPLETED, created_at: MoreThan(twelveHoursAgo) },
                        { expert_id: expertId, status: ChatSessionStatus.EXPIRED, created_at: MoreThan(twelveHoursAgo) },
                    ],
                    relations: ['user'],
                    order: { created_at: 'DESC' },
                });

            case ExpertSessionFilter.COMPLETED:
                return this.sessionRepo.find({
                    where: [
                        { expert_id: expertId, status: ChatSessionStatus.COMPLETED },
                        { expert_id: expertId, status: ChatSessionStatus.EXPIRED },
                        { expert_id: expertId, status: ChatSessionStatus.CANCELLED },
                    ],
                    relations: ['user'],
                    order: { created_at: 'DESC' },
                });

            case ExpertSessionFilter.RECENT_COMPLETED:
                return this.sessionRepo.find({
                    where: [
                        { expert_id: expertId, status: ChatSessionStatus.COMPLETED, created_at: MoreThan(twelveHoursAgo) },
                        { expert_id: expertId, status: ChatSessionStatus.EXPIRED, created_at: MoreThan(twelveHoursAgo) },
                        { expert_id: expertId, status: ChatSessionStatus.CANCELLED, created_at: MoreThan(twelveHoursAgo) },
                    ],
                    relations: ['user'],
                    order: { created_at: 'DESC' },
                });

            case ExpertSessionFilter.ALL:
                return this.sessionRepo.find({
                    where: { expert_id: expertId },
                    relations: ['user'],
                    order: { created_at: 'DESC' },
                });

            default:
                return [];
        }
    }
}
