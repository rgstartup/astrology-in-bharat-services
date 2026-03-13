import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CallSession, CallSessionStatus } from '../../infrastructure/persistence/entities/call-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

export enum CallSessionFilter {
    PENDING = 'pending',
    COMPLETED = 'completed',
    RECENT_PENDING = 'recent_pending',
    RECENT_COMPLETED = 'recent_completed',
    ALL = 'all'
}

@Injectable()
export class GetExpertCallSessionsUseCase {
    constructor(
        @InjectRepository(CallSession)
        private sessionRepo: Repository<CallSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
    ) { }

    async execute(expertUserId: number, filter: CallSessionFilter) {
        const expert = await this.expertRepo.findOne({
            where: { user_id: expertUserId }
        });

        if (!expert) return [];

        const query: any = {
            where: { expert_id: expert.id },
            relations: ['user'],
            order: { created_at: 'DESC' }
        };

        switch (filter) {
            case CallSessionFilter.PENDING:
                query.where.status = In([CallSessionStatus.PENDING, CallSessionStatus.ACTIVE]);
                break;
            case CallSessionFilter.COMPLETED:
                query.where.status = In([CallSessionStatus.COMPLETED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED]);
                break;
            case CallSessionFilter.RECENT_PENDING:
                query.where.status = In([CallSessionStatus.PENDING, CallSessionStatus.ACTIVE]);
                query.take = 20;
                break;
            case CallSessionFilter.RECENT_COMPLETED:
                query.where.status = In([CallSessionStatus.COMPLETED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED]);
                query.take = 20;
                break;
            case CallSessionFilter.ALL:
            default:
                break;
        }

        return this.sessionRepo.find(query);
    }
}
