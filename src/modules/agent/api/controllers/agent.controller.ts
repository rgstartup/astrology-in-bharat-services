import { Controller, Get, UseGuards, Patch, Body, Post, Query, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { AgentProfile } from '../../infrastructure/persistence/entities/agent-profile.entity';
import { AgentListing } from '../../infrastructure/persistence/entities/agent-listing.entity';
import { DatabaseService } from '@/core/database/database.service';

import { In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemSetting } from '@/modules/admin/infrastructure/persistence/entities/system-setting.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Controller({
    path: 'agent',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent')
export class AgentController {
    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
        private readonly walletFacade: WalletFacade,
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
                account_holder: body.account_holder,
            });
        });
        return { success: true };
    }

    @Get('dashboard/stats')
    async getStats(@CurrentUser() user: User) {
        return this.db.transaction(async (queryRunner) => {
            const profile = await queryRunner.manager.findOne(AgentProfile, {
                where: { user_id: user.id }
            });

            // Filter out any nulls or non-numeric values that might have crept into the arrays
            const registeredUserIds = (profile?.registered_user_ids || []).filter(id => id && typeof id === 'number');
            const registeredAstrologerIds = (profile?.registered_astrologer_ids || []).filter(id => id && typeof id === 'number');
            const allRegisteredIds = Array.from(new Set([...registeredUserIds, ...registeredAstrologerIds]));

            // Count total users (astrologers + clients) referred by this agent or in their registered list
            const totalUsersQuery = queryRunner.manager
                .createQueryBuilder(User, 'u')
                .where('u.referred_by_id = :agentId', { agentId: user.id });

            if (allRegisteredIds.length > 0) {
                totalUsersQuery.orWhere('u.id IN (:...ids)', { ids: allRegisteredIds });
            }

            const totalUsers = await totalUsersQuery.getCount();

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
                .where('u.referred_by_id = :agentId', { agentId: user.id });

            if (allRegisteredIds.length > 0) {
                qbUsers.orWhere('u.id IN (:...ids)', { ids: allRegisteredIds });
            }

            const usersForStats = await qbUsers.getMany();

            const settings = await queryRunner.manager.find(SystemSetting, {
                where: {
                    key: In(['COMMISSION_FROM_CLIENT', 'COMMISSION_FROM_ASTROLOGER', 'COMMISSION_FROM_PUJA_SHOP', 'COMMISION_FROM_CLIENT', 'COMMISION_FROM_ASTROLOGER', 'COMMISION_FROM_PUJA_SHOP'])
                }
            });

            const getSettingValue = (keys: string[], defaultValue: number) => {
                const setting = settings.find(s => keys.includes(s.key));
                return setting ? parseFloat(setting.value) : defaultValue;
            };

            const clientCommPercent = getSettingValue(['COMMISSION_FROM_CLIENT', 'COMMISION_FROM_CLIENT'], 3);
            const expertCommPercent = getSettingValue(['COMMISSION_FROM_ASTROLOGER', 'COMMISION_FROM_ASTROLOGER'], 3);

            let totalAgentCommission = 0;
            let astrologersCount = 0;
            let clientsCount = 0;
            let merchantsAsPujaShopCount = 0;

            usersForStats.forEach(u => {
                const roles = (u.roles || []).map(r => r.name.toLowerCase());
                const isExpert = roles.includes('expert');
                const isMerchant = roles.includes('merchant');

                if (isExpert) astrologersCount++;
                else if (isMerchant) merchantsAsPujaShopCount++;
                else clientsCount++;

                if (u.profile_expert) {
                    const earning = Number(u.profile_expert.total_earning || 0);
                    if (!isNaN(earning)) {
                        totalAgentCommission += (earning * expertCommPercent) / 100;
                    }
                }
                if (u.profile_client) {
                    const spending = Number(u.profile_client.total_spending || 0);
                    if (!isNaN(spending)) {
                        totalAgentCommission += (spending * clientCommPercent) / 100;
                    }
                }
            });

            const withdrawalStats = await this.walletFacade.getWithdrawalsStatus(user.id);

            return {
                totalListings: totalUsers + totalMandirs + totalPujaShops,
                activeListings: totalUsers,
                expertsCount: astrologersCount,
                clientsCount,
                mandirsCount: totalMandirs,
                pujaShopsCount: totalPujaShops + merchantsAsPujaShopCount,
                pendingPayout: withdrawalStats.pendingWithdrawals,
                totalEarned: profile?.total_earnings || 0,
                commissionEarned: parseFloat(totalAgentCommission.toFixed(2)),
                recentActivity: []
            };
        });
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
            const isPlaceType = type === 'mandir' || type === 'puja_shop' || type === 'merchant';
            const isUserType = type === 'astrologer' || type === 'expert' || type === 'client' || type === 'merchant' || type === 'puja_shop';
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
                    .where('u.referred_by_id = :agentId', { agentId: user.id });

                if (allRegisteredIds.length > 0) {
                    qb.orWhere('u.id IN (:...ids)', { ids: allRegisteredIds });
                }

                if (type === 'astrologer' || type === 'expert') {
                    qb.andWhere('role.name = :role', { role: 'expert' });
                } else if (type === 'client') {
                    qb.andWhere('role.name = :role', { role: 'client' });
                } else if (type === 'puja_shop' || type === 'merchant') {
                    qb.andWhere('role.name = :role', { role: 'merchant' });
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

                // Fetch commission rates from system settings
                const settings = await queryRunner.manager.find(SystemSetting, {
                    where: {
                        key: In(['COMMISION_FROM_CLIENT', 'COMMISION_FROM_ASTROLOGER', 'COMMISION_FROM_PUJA_SHOP'])
                    }
                });

                const getSettingValue = (key: string, defaultValue: number) => {
                    const setting = settings.find(s => s.key === key);
                    return setting ? parseFloat(setting.value) : defaultValue;
                };

                const clientCommPercent = getSettingValue('COMMISION_FROM_CLIENT', 3);
                const expertCommPercent = getSettingValue('COMMISION_FROM_ASTROLOGER', 3);
                const merchantCommPercent = getSettingValue('COMMISION_FROM_PUJA_SHOP', 3);

                userData = users.map(u => {
                    const roles = (u.roles || []).map(r => r.name.toLowerCase());
                    const isExpert = roles.includes('expert');
                    const isMerchant = roles.includes('merchant');

                    let commission = 0;

                    if (u.profile_expert) {
                        commission += (Number(u.profile_expert.total_earning || 0) * expertCommPercent) / 100;
                    }
                    if (u.profile_client) {
                        commission += (Number(u.profile_client.total_spending || 0) * clientCommPercent) / 100;
                    }
                    // For merchants, commission calculation would go here if they have total_sales etc.

                    return {
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        phone: u.profile_client?.phone || u.profile_expert?.phone_number || (u as any).profile_merchant?.phone || null,
                        status: 'active',
                        type: isExpert ? 'expert' : isMerchant ? 'merchant' : 'client',
                        createdAt: u.created_at,
                        avatar: u.avatar ?? null,
                        totalSpending: u.profile_client?.total_spending || 0,
                        totalEarning: u.profile_expert?.total_earning || 0,
                        commission: Number(commission.toFixed(2)),
                        commissionPercent: isExpert ? expertCommPercent : isMerchant ? merchantCommPercent : clientCommPercent
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

    // ── Get commission transactions ──────────────────────────────────
    @Get('commissions')
    async getCommissions(
        @CurrentUser() user: User,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        const result = await this.walletFacade.getTransactions(user.id, page, limit, 'all', 'agent_commission');
        return {
            data: result.items.map(t => ({
                ...t,
                date: t.created_at,
                // Status is already included by GetTransactionsUseCase if it's a withdrawal, 
                // for others it defaults to 'completed' which maps to 'paid' in UI logic
                status: (t as any).status === 'completed' ? 'paid' : (t as any).status || 'paid'
            })),
            total: result.total,
            page: result.page,
            limit: result.limit
        };
    }

    // ── Wallet / Payouts ──────────────────────────────────────────────────
    @Get('wallet/balance')
    async getBalance(@CurrentUser() user: User) {
        return this.walletFacade.getBalance(user.id);
    }

    @Get('wallet/withdrawals')
    async getWithdrawals(@CurrentUser() user: User) {
        const result = await this.walletFacade.getWithdrawals(user.id);
        return result.items; // Return array only for frontend compatibility
    }

    @Post('wallet/withdraw')
    async requestWithdrawal(
        @CurrentUser() user: User,
        @Body('amount') amount: number,
    ) {
        // Find agent profile to get bank details if needed
        // RequestWithdrawalUseCase already handles fetching bank details from ProfileMerchant, 
        // but agents have AgentProfile. 
        // We might need to update RequestWithdrawalUseCase to support AgentProfile too.
        return this.walletFacade.requestWithdrawal(user.id, amount);
    }
}

