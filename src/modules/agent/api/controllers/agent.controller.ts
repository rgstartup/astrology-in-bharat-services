import { Controller, Get, UseGuards, Patch, Body, Post, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { AgentProfile } from '../../infrastructure/persistence/entities/agent-profile.entity';
import { AgentListing } from '../../infrastructure/persistence/entities/agent-listing.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { DatabaseService } from '@/core/database/database.service';
import { ConfigService } from '@nestjs/config';

@Controller({
    path: 'agent',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent')
export class AgentController {
    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService
    ) { }

    private async getAgentProfile(queryRunner: any, betterAuthUserId: string): Promise<AgentProfile> {
        const profile = await queryRunner.manager.findOne(AgentProfile, {
            where: { better_auth_user_id: betterAuthUserId },
        });
        if (!profile) throw new NotFoundException('Agent profile not found');
        return profile;
    }

    @Get('profile')
    async getProfile(@CurrentUser() user: AuthenticatedUser) {
        return this.db.transaction(async (queryRunner) => {
            return queryRunner.manager.findOne(AgentProfile, {
                where: { better_auth_user_id: user.id },
            });
        });
    }

    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: any
    ) {
        await this.db.transaction(async (queryRunner) => {
            await queryRunner.manager.update(AgentProfile, { better_auth_user_id: user.id }, {
                bank_name: body.bank_name,
                account_number: body.account_number,
                ifsc_code: body.ifsc_code,
            });
        });
        return { success: true };
    }

    @Get('dashboard/stats')
    async getStats(@CurrentUser() user: AuthenticatedUser) {
        return this.db.transaction(async (queryRunner) => {
            const profile = await this.getAgentProfile(queryRunner, user.id);
            const agentLocalId = profile.user_id;

            const registeredUserIds = profile?.registered_user_ids || [];
            const registeredAstrologerIds = profile?.registered_astrologer_ids || [];
            const allRegisteredIds = [...registeredUserIds, ...registeredAstrologerIds];

            const totalUsers = await queryRunner.manager
                .createQueryBuilder(User, 'u')
                .where('(u.referred_by_id = :agentId OR u.id IN (:...ids))', {
                    agentId: agentLocalId,
                    ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
                })
                .getCount();

            const totalMandirs = await queryRunner.manager.count(AgentListing, {
                where: { agent_id: agentLocalId, type: 'mandir' }
            });
            const totalPujaShops = await queryRunner.manager.count(AgentListing, {
                where: { agent_id: agentLocalId, type: 'puja_shop' }
            });

            const usersForStats: any[] = await queryRunner.manager
                .createQueryBuilder(User, 'u')
                .leftJoinAndMapOne('u.profile_expert', ProfileExpert, 'pe', 'pe.user_id = u.id')
                .leftJoinAndMapOne('u.profile_client', ProfileClient, 'pc', 'pc.user_id = u.id')
                .where('(u.referred_by_id = :agentId OR u.id IN (:...ids))', {
                    agentId: agentLocalId,
                    ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
                })
                .getMany();

            const clientCommPercent = this.configService.get<number>('COMMISION_FROM_CLIENT') || 0;
            const expertCommPercent = this.configService.get<number>('COMMISION_FROM_ASTROLOGER') || 0;

            let totalAgentCommission = 0;
            let astrologersCount = 0;
            let clientsCount = 0;

            usersForStats.forEach((u: any) => {
                const isExpert = u.role === 'expert';
                if (isExpert) {
                    astrologersCount++;
                } else {
                    clientsCount++;
                }

                if (u.profile_expert) {
                    totalAgentCommission += (Number(u.profile_expert.total_earning || 0) * expertCommPercent) / 100;
                }
                if (u.profile_client) {
                    totalAgentCommission += (Number(u.profile_client.total_spending || 0) * clientCommPercent) / 100;
                }
            });

            return {
                totalListings: totalUsers + totalMandirs + totalPujaShops,
                activeListings: totalUsers,
                astrologersCount,
                clientsCount,
                mandirsCount: totalMandirs,
                pujaShopsCount: totalPujaShops,
                pendingPayout: 0,
                totalEarned: profile?.total_earnings || 0,
                commissionEarned: Number(totalAgentCommission.toFixed(2)),
                recentActivity: []
            };
        });
    }

    @Post('listings')
    async createListing(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: any,
    ) {
        const allowedTypes = ['mandir', 'puja_shop'];
        if (!body.type || !allowedTypes.includes(body.type)) {
            throw new BadRequestException('type must be "mandir" or "puja_shop"');
        }
        if (!body.name || !body.name.trim()) {
            throw new BadRequestException('name is required');
        }

        return this.db.transaction(async (queryRunner) => {
            const profile = await this.getAgentProfile(queryRunner, user.id);

            const newListing = queryRunner.manager.create(AgentListing, {
                type: body.type,
                name: body.name.trim(),
                location: body.location?.trim() || null,
                phone: body.phone?.trim() || null,
                deity: body.deity?.trim() || null,
                items: body.items?.trim() || null,
                status: 'pending',
                agent_id: profile.user_id,
            });
            const listing = await queryRunner.manager.save(AgentListing, newListing);

            return {
                success: true,
                message: `${body.type === 'puja_shop' ? 'Puja Shop' : 'Mandir'} listing created successfully`,
                listing,
            };
        });
    }

    @Get('listings')
    async getListings(
        @CurrentUser() user: AuthenticatedUser,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('type') type?: string,
        @Query('search') search?: string,
    ) {
        return this.db.transaction(async (queryRunner) => {
            const isPlaceType = type === 'mandir' || type === 'puja_shop';
            const isUserType = type === 'astrologer' || type === 'client';
            const isAll = !type || type === 'all';

            let userData: any[] = [];
            let userTotal = 0;
            let placeData: any[] = [];
            let placeTotal = 0;

            const agentProfile = await this.getAgentProfile(queryRunner, user.id);
            const agentLocalId = agentProfile.user_id;

            const registeredUserIds = agentProfile?.registered_user_ids || [];
            const registeredAstrologerIds = agentProfile?.registered_astrologer_ids || [];
            const allRegisteredIds = [...registeredUserIds, ...registeredAstrologerIds];

            if (isUserType || isAll) {
                const qb = queryRunner.manager
                    .createQueryBuilder(User, 'u')
                    .leftJoinAndMapOne('u.profile_expert', ProfileExpert, 'pe', 'pe.user_id = u.id')
                    .leftJoinAndMapOne('u.profile_client', ProfileClient, 'pc', 'pc.user_id = u.id')
                    .where('(u.referred_by_id = :agentId OR u.id IN (:...ids))', {
                        agentId: agentLocalId,
                        ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
                    });

                if (type === 'astrologer') {
                    qb.andWhere('u.role = :role', { role: 'expert' });
                } else if (type === 'client') {
                    qb.andWhere('u.role = :role', { role: 'client' });
                }

                if (search && search.trim()) {
                    qb.andWhere(
                        '(LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search)',
                        { search: `%${search.trim().toLowerCase()}%` }
                    );
                }

                qb.orderBy('u.created_at', 'DESC');

                if (!isAll) {
                    qb.skip((page - 1) * limit).take(limit);
                }

                const [users, total] = await qb.getManyAndCount();
                userTotal = total;

                const clientCommPercent = this.configService.get<number>('COMMISION_FROM_CLIENT') || 0;
                const expertCommPercent = this.configService.get<number>('COMMISION_FROM_ASTROLOGER') || 0;

                userData = (users as any[]).map((u: any) => {
                    const isExpert = u.role === 'expert';
                    let commission = 0;

                    if (u.profile_expert) {
                        commission += (Number(u.profile_expert.total_earning || 0) * expertCommPercent) / 100;
                    }
                    if (u.profile_client) {
                        commission += (Number(u.profile_client.total_spending || 0) * clientCommPercent) / 100;
                    }

                    return {
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        phone: u.profile_client?.phone || u.profile_expert?.phone_number || null,
                        status: 'active',
                        type: isExpert ? 'astrologer' : 'client',
                        createdAt: u.created_at,
                        avatar: u.avatar ?? null,
                        totalSpending: u.profile_client?.total_spending || 0,
                        totalEarning: u.profile_expert?.total_earning || 0,
                        commission: Number(commission.toFixed(2)),
                        commissionPercent: isExpert ? expertCommPercent : clientCommPercent
                    };
                });
            }

            if (isPlaceType || isAll) {
                const qb = queryRunner.manager
                    .createQueryBuilder(AgentListing, 'al')
                    .where('al.agent_id = :agentId', { agentId: agentLocalId });

                if (isPlaceType) {
                    qb.andWhere('al.type = :type', { type });
                }

                if (search && search.trim()) {
                    qb.andWhere(
                        '(LOWER(al.name) LIKE :search OR LOWER(al.location) LIKE :search)',
                        { search: `%${search.trim().toLowerCase()}%` }
                    );
                }

                qb.orderBy('al.created_at', 'DESC');

                if (!isAll) {
                    qb.skip((page - 1) * limit).take(limit);
                }

                const [places, total] = await qb.getManyAndCount();
                placeTotal = total;
                placeData = places.map(p => ({
                    id: `listing-${p.id}`,
                    name: p.name,
                    email: null,
                    phone: p.phone,
                    status: p.status,
                    type: p.type,
                    location: p.location,
                    deity: p.deity,
                    items: p.items,
                    createdAt: p.created_at,
                    avatar: null,
                }));
            }

            const allData = [...userData, ...placeData].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            const allTotal = userTotal + placeTotal;

            if (isAll) {
                const start = (page - 1) * limit;
                return { data: allData.slice(start, start + limit), total: allTotal, page, limit };
            }

            return {
                data: isPlaceType ? placeData : userData,
                total: isPlaceType ? placeTotal : userTotal,
                page,
                limit,
            };
        });
    }
}
