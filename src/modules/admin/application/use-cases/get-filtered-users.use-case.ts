import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ChatSession, ChatSessionStatus } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { Order, OrderStatus } from '@/modules/order/infrastructure/persistence/entities/order.entity';

export interface FilterCriteria {
    minSpending?: number;
    maxSpending?: number;
    spendingPeriod?: 'last_month' | 'last_3_months' | 'last_6_months' | 'all_time';
    minSessions?: number;
    registeredBefore?: string;
    registeredAfter?: string;
    userType?: 'all' | 'premium' | 'regular';
    isBlocked?: boolean;
    page?: number;
    limit?: number;
}

@Injectable()
export class GetFilteredUsersUseCase {
    private readonly logger = new Logger(GetFilteredUsersUseCase.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly dataSource: DataSource,
    ) { }


    private buildBaseQuery(filters: FilterCriteria): SelectQueryBuilder<User> {
        const query = this.userRepo.createQueryBuilder('user')
            .where('user.role = :roleName', { roleName: 'client' })
            .distinct(true);


        if (filters.isBlocked !== undefined) {
            query.andWhere('user.is_blocked = :isBlocked', { isBlocked: filters.isBlocked });
        }

        if (filters.registeredAfter && filters.registeredAfter.trim() !== "") {
            const date = new Date(filters.registeredAfter);
            if (!isNaN(date.getTime())) {
                query.andWhere('user.created_at >= :after', { after: date });
            }
        }

        if (filters.registeredBefore && filters.registeredBefore.trim() !== "") {
            const date = new Date(filters.registeredBefore);
            if (!isNaN(date.getTime())) {
                query.andWhere('user.created_at <= :before', { before: date });
            }
        }

        return query;
    }


    private async applyComplexFilters(query: SelectQueryBuilder<User>, filters: FilterCriteria) {
        // Filter by Sessions
        if (filters.minSessions && filters.minSessions > 0) {
            query.andWhere((qb) => {
                const subQuery = qb.subQuery()
                    .select('COUNT(session.id)')
                    .from(ChatSession, 'session')
                    .where('session.user_id = user.id')
                    .andWhere('session.status = :sessStatus', { sessStatus: ChatSessionStatus.COMPLETED })
                    .getQuery();
                return `${subQuery} >= :minSess`;
            }).setParameter('minSess', filters.minSessions);
        }

        // Filter by Spending
        if (filters.minSpending !== undefined || filters.maxSpending !== undefined || filters.userType === 'premium' || filters.userType === 'regular') {
            const now = new Date();
            let sinceDate: Date | null = null;
            if (filters.spendingPeriod && filters.spendingPeriod !== 'all_time') {
                sinceDate = new Date();
                if (filters.spendingPeriod === 'last_month') sinceDate.setMonth(now.getMonth() - 1);
                else if (filters.spendingPeriod === 'last_3_months') sinceDate.setMonth(now.getMonth() - 3);
                else if (filters.spendingPeriod === 'last_6_months') sinceDate.setMonth(now.getMonth() - 6);
            }

            // Subquery for total spending
            const getSpendingSubquery = (qb: SelectQueryBuilder<any>) => {
                const sq = qb.subQuery()
                    .select('COALESCE(SUM(order.total_amount), 0)')
                    .from(Order, 'order')
                    .where('order.user_id = user.id')
                    .andWhere('order.status = :orderPaid', { orderPaid: OrderStatus.PAID });
                
                if (sinceDate) {
                    sq.andWhere('order.created_at >= :sinceDate', { sinceDate });
                }
                return sq.getQuery();
            };

            if (filters.userType === 'premium') {
                query.andWhere(`${getSpendingSubquery(query)} > 0`);
            } else if (filters.userType === 'regular') {
                query.andWhere(`${getSpendingSubquery(query)} = 0`);
            }

            if (filters.minSpending !== undefined) {
                query.andWhere(`${getSpendingSubquery(query)} >= :minSpend`, { minSpend: filters.minSpending });
            }

            if (filters.maxSpending !== undefined) {
                query.andWhere(`${getSpendingSubquery(query)} <= :maxSpend`, { maxSpend: filters.maxSpending });
            }
        }
    }

    async executeCount(filters: FilterCriteria): Promise<number> {
        const query = this.buildBaseQuery(filters);
        await this.applyComplexFilters(query, filters);
        return query.getCount();
    }

    async executeList(filters: FilterCriteria) {
        const query = this.buildBaseQuery(filters);
        await this.applyComplexFilters(query, filters);

        const page = filters.page || 1;
        const limit = filters.limit || 10;

        const users = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        // Enhance with stats for preview
        const enhancedUsers = await Promise.all(users.map(async (u) => {
            const sessionCount = await this.dataSource.getRepository(ChatSession).count({
                where: { user_id: u.id, status: ChatSessionStatus.COMPLETED }
            });

            const spendingResult = await this.dataSource.getRepository(Order).createQueryBuilder('order')
                .select('SUM(order.total_amount)', 'total')
                .where('order.user_id = :uid', { uid: u.id })
                .andWhere('order.status = :st', { st: OrderStatus.PAID })
                .getRawOne();

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                totalSpending: parseFloat(spendingResult?.total) || 0,
                sessionCount,
                registeredAt: u.created_at
            };
        }));

        return enhancedUsers;
    }
}
