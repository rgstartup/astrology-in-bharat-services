// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CallSession, CallSessionStatus } from '../../infrastructure/entities/call-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

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

    async execute(expertuserId: string, filter: CallSessionFilter, options: { limit?: number; offset?: number; search?: string } = {}) {
        const expert = await this.expertRepo.findOne({
            where: { user_id: expertUserId }
        });

        if (!expert) return { data: [], meta: { totalCount: 0 } };

        const queryBuilder = this.sessionRepo.createQueryBuilder('session')
            .leftJoinAndSelect('session.user', 'user')
            .leftJoinAndMapOne('user.profile_client', ProfileClient, 'profile_client', 'profile_client.user_id = user.id')
            .where('session.expert_id = :expertId', { expertId: expert.id });

        switch (filter) {
            case CallSessionFilter.PENDING:
                queryBuilder.andWhere('session.status IN (:...statuses)', { statuses: [CallSessionStatus.PENDING, CallSessionStatus.ACTIVE] });
                break;
            case CallSessionFilter.COMPLETED:
                queryBuilder.andWhere('session.status IN (:...statuses)', { statuses: [CallSessionStatus.COMPLETED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED] });
                break;
            case CallSessionFilter.RECENT_PENDING:
                queryBuilder.andWhere('session.status IN (:...statuses)', { statuses: [CallSessionStatus.PENDING, CallSessionStatus.ACTIVE] });
                queryBuilder.limit(20);
                break;
            case CallSessionFilter.RECENT_COMPLETED:
                queryBuilder.andWhere('session.status IN (:...statuses)', { statuses: [CallSessionStatus.COMPLETED, CallSessionStatus.CANCELLED, CallSessionStatus.REJECTED] });
                queryBuilder.limit(20);
                break;
            case CallSessionFilter.ALL:
            default:
                break;
        }

        if (options.search) {
            queryBuilder.andWhere('user.name ILIKE :search', { search: `%${options.search}%` });
        }

        queryBuilder.orderBy('session.created_at', 'DESC');

        const totalCount = await queryBuilder.getCount();

        if (options.limit !== undefined) {
            queryBuilder.limit(options.limit);
        }
        if (options.offset !== undefined) {
            queryBuilder.offset(options.offset);
        }

        const data = await queryBuilder.getMany();
        return { data, meta: { totalCount } };
    }

    async getRevenueAndCount(expertProfileId: number) {
        const stats = await this.sessionRepo
            .createQueryBuilder('call')
            .select("SUM(call.final_price)", "total")
            .addSelect("COUNT(call.id)", "count")
            .where('call.expert_id = :id AND call.status = :status', { id: expertProfileId, status: 'completed' })
            .getRawOne();
        return {
            total: parseFloat(stats.total) || 0,
            count: parseInt(stats.count, 10) || 0,
        };
    }
}
