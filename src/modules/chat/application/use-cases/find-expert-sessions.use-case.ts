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
                        { expertId, status: ChatSessionStatus.PENDING },
                        { expertId, status: ChatSessionStatus.ACTIVE },
                        {
                            expertId,
                            status: ChatSessionStatus.COMPLETED,
                            createdAt: MoreThan(oneHourAgo),
                        },
                        {
                            expertId,
                            status: ChatSessionStatus.EXPIRED,
                            createdAt: MoreThan(oneHourAgo),
                        },
                    ],
                    relations: ['user'],
                    order: { createdAt: 'DESC' },
                });

            case ExpertSessionFilter.RECENT_PENDING:
                return this.sessionRepo.find({
                    where: [
                        { expertId, status: ChatSessionStatus.PENDING, createdAt: MoreThan(twelveHoursAgo) },
                        { expertId, status: ChatSessionStatus.ACTIVE, createdAt: MoreThan(twelveHoursAgo) },
                        { expertId, status: ChatSessionStatus.COMPLETED, createdAt: MoreThan(twelveHoursAgo) },
                        { expertId, status: ChatSessionStatus.EXPIRED, createdAt: MoreThan(twelveHoursAgo) },
                    ],
                    relations: ['user'],
                    order: { createdAt: 'DESC' },
                });

            case ExpertSessionFilter.COMPLETED:
                return this.sessionRepo.find({
                    where: [
                        { expertId, status: ChatSessionStatus.COMPLETED },
                        { expertId, status: ChatSessionStatus.EXPIRED },
                        { expertId, status: ChatSessionStatus.CANCELLED },
                    ],
                    relations: ['user'],
                    order: { createdAt: 'DESC' },
                });

            case ExpertSessionFilter.RECENT_COMPLETED:
                return this.sessionRepo.find({
                    where: [
                        { expertId, status: ChatSessionStatus.COMPLETED, createdAt: MoreThan(twelveHoursAgo) },
                        { expertId, status: ChatSessionStatus.EXPIRED, createdAt: MoreThan(twelveHoursAgo) },
                        { expertId, status: ChatSessionStatus.CANCELLED, createdAt: MoreThan(twelveHoursAgo) },
                    ],
                    relations: ['user'],
                    order: { createdAt: 'DESC' },
                });

            case ExpertSessionFilter.ALL:
                return this.sessionRepo.find({
                    where: { expertId },
                    relations: ['user'],
                    order: { createdAt: 'DESC' },
                });

            default:
                return [];
        }
    }
}
