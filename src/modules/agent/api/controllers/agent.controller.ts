import { Controller, Get, UseGuards, Patch, Body, Post, Query, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { AgentProfile } from '../../infrastructure/persistence/entities/agent-profile.entity';
import { AgentListing } from '../../infrastructure/persistence/entities/agent-listing.entity';
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

    @Get('profile')
    async getProfile(@CurrentUser() user: User) {
        const profile = await this.db.transaction(async (queryRunner) => {
            return queryRunner.manager.findOne(AgentProfile, {
                where: { user_id: user.id },
                relations: ['user'] as any
            });
        });
        return profile;
    }

    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: User,
        @Body() body: any
    ) {
        await this.db.transaction(async (queryRunner) => {
            await queryRunner.manager.update(AgentProfile, { user_id: user.id }, {
                bank_name: body.bank_name,
                account_number: body.account_number,
                ifsc_code: body.ifsc_code,
            });
        });
        return { success: true };
    }

    @Get('dashboard/stats')
    async getStats(@CurrentUser() user: User) {
        const stats = await this.db.transaction(async (queryRunner) => {
            const profile = await queryRunner.manager.findOne(AgentProfile, {
                where: { user_id: user.id }
            });

            const registeredUserIds = profile?.registered_user_ids || [];
            const registeredAstrologerIds = profile?.registered_astrologer_ids || [];
            const allRegisteredIds = [...registeredUserIds, ...registeredAstrologerIds];

            // Count total users (astrologers + clients) referred by this agent or in their registered list
            const totalUsers = await queryRunner.manager
                .createQueryBuilder(User, 'u')
                .where('(u.referred_by_id = :agentId OR u.id IN (:...ids))', {
                    agentId: Number(user.id),
                    ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
                })
                .getCount();

            // Count mandir/puja_shop listings by this agent
            const totalMandirs = await queryRunner.manager.count(AgentListing, {
                where: { agent_id: user.id, type: 'mandir' }
            });
            const totalPujaShops = await queryRunner.manager.count(AgentListing, {
                where: { agent_id: user.id, type: 'puja_shop' }
            });

            // Re-fetch all referred users for commission calculation
            const qbUsers = queryRunner.manager
                .createQueryBuilder(User, 'u')
                .leftJoinAndSelect('u.profile_expert', 'pe')
                .leftJoinAndSelect('u.profile_client', 'pc')
                .leftJoinAndSelect('u.roles', 'role')
                .where('(u.referred_by_id = :agentId OR u.id IN (:...ids))', {
                    agentId: Number(user.id),
                    ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
                });
            const usersForStats = await qbUsers.getMany();

            const clientCommPercent = this.configService.get<number>('COMMISION_FROM_CLIENT') || 0;
            const expertCommPercent = this.configService.get<number>('COMMISION_FROM_ASTROLOGER') || 0;


            let totalAgentCommission = 0;
            let astrologersCount = 0;
            let clientsCount = 0;

            usersForStats.forEach(u => {
                const isExpert = (u.roles || []).some(r => r.name.toLowerCase() === 'expert');
                if (isExpert) {
                    astrologersCount++;
                    if (u.profile_expert) {
                        totalAgentCommission += (u.profile_expert.total_earning * expertCommPercent) / 100;
                    }
                } else {
                    clientsCount++;
                    if (u.profile_client) {
                        totalAgentCommission += (u.profile_client.total_spending * clientCommPercent) / 100;
                    }
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
        return stats;
    }

    // ── Create a mandir / puja_shop listing ──────────────────────────────
    @Post('listings')
    async createListing(
        @CurrentUser() user: User,
        @Body() body: any,
    ) {
        const allowedTypes = ['mandir', 'puja_shop'];
        if (!body.type || !allowedTypes.includes(body.type)) {
            throw new BadRequestException('type must be "mandir" or "puja_shop"');
        }
        if (!body.name || !body.name.trim()) {
            throw new BadRequestException('name is required');
        }

        const listing = await this.db.transaction(async (queryRunner) => {
            const newListing = queryRunner.manager.create(AgentListing, {
                type: body.type,
                name: body.name.trim(),
                location: body.location?.trim() || null,
                phone: body.phone?.trim() || null,
                deity: body.deity?.trim() || null,
                items: body.items?.trim() || null,
                status: 'pending',
                agent_id: user.id,
            });
            return queryRunner.manager.save(AgentListing, newListing);
        });

        return {
            success: true,
            message: `${body.type === 'puja_shop' ? 'Puja Shop' : 'Mandir'} listing created successfully`,
            listing,
        };
    }

    // ── Get listings — users + mandir/puja_shop combined ─────────────────
    @Get('listings')
    async getListings(
        @CurrentUser() user: User,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('type') type?: string,
        @Query('search') search?: string,
    ) {
        const listings = await this.db.transaction(async (queryRunner) => {
            // Determine which data sources to query
            const isPlaceType = type === 'mandir' || type === 'puja_shop';
            const isUserType = type === 'astrologer' || type === 'client';
            const isAll = !type || type === 'all';

            let userData: any[] = [];
            let userTotal = 0;
            let placeData: any[] = [];
            let placeTotal = 0;

            // Get agent profile to find registered IDs
            const agentProfile = await queryRunner.manager.findOne(AgentProfile, {
                where: { user_id: user.id }
            });

            const registeredUserIds = agentProfile?.registered_user_ids || [];
            const registeredAstrologerIds = agentProfile?.registered_astrologer_ids || [];
            const allRegisteredIds = [...registeredUserIds, ...registeredAstrologerIds];

            // ── Fetch referred users (astrologer / client) ──
            if (isUserType || isAll) {
                console.log(`[AgentListings] Fetching users for agentId: ${user.id} (Type: ${typeof user.id}), type: ${type}, search: ${search}`);
                const qb = queryRunner.manager
                    .createQueryBuilder(User, 'u')
                    .leftJoinAndSelect('u.roles', 'role')
                    .leftJoinAndSelect('u.profile_expert', 'pe')
                    .leftJoinAndSelect('u.profile_client', 'pc')
                    .where('(u.referred_by_id = :agentId OR u.id IN (:...ids))', {
                        agentId: Number(user.id),
                        ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
                    });

                if (type === 'astrologer') {
                    qb.andWhere('role.name = :role', { role: 'expert' });
                } else if (type === 'client') {
                    qb.andWhere('role.name = :role', { role: 'client' });
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
                console.log(`[AgentListings] Found ${total} users for agentId: ${user.id}`);
                userTotal = total;

                const clientCommPercent = this.configService.get<number>('COMMISION_FROM_CLIENT') || 0;
                const expertCommPercent = this.configService.get<number>('COMMISION_FROM_ASTROLOGER') || 0;

                userData = users.map(u => {
                    const isExpert = (u.roles || []).some(r => r.name.toLowerCase() === 'expert');
                    let commission = 0;
                    let baseAmount = 0;

                    if (isExpert && u.profile_expert) {
                        baseAmount = u.profile_expert.total_earning;
                        commission = (baseAmount * expertCommPercent) / 100;
                    } else if (!isExpert && u.profile_client) {
                        baseAmount = u.profile_client.total_spending;
                        commission = (baseAmount * clientCommPercent) / 100;
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
                        totalSpending: !isExpert ? baseAmount : null,
                        totalEarning: isExpert ? baseAmount : null,
                        commission: Number(commission.toFixed(2)),
                        commissionPercent: isExpert ? expertCommPercent : clientCommPercent
                    };
                });
            }

            // ── Fetch mandir / puja_shop listings ──
            if (isPlaceType || isAll) {
                const qb = queryRunner.manager
                    .createQueryBuilder(AgentListing, 'al')
                    .where('al.agent_id = :agentId', { agentId: Number(user.id) });

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

            // Merge & Sort by date descending
            const allData = [...userData, ...placeData].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });
            const allTotal = userTotal + placeTotal;

            // If paginating "all", slice here
            if (isAll) {
                const start = (page - 1) * limit;
                return {
                    data: allData.slice(start, start + limit),
                    total: allTotal,
                    page,
                    limit,
                };
            }

            return {
                data: isPlaceType ? placeData : userData,
                total: isPlaceType ? placeTotal : userTotal,
                page,
                limit,
            };
        });
        return listings;
    }
}

