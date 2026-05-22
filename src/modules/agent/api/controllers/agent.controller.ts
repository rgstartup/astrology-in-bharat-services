// @ts-nocheck
import { Controller, Get, UseGuards, Patch, Body, Post, Query, BadRequestException, ParseUUIDPipe, Headers, Ip } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { AgentListing } from '../../infrastructure/entities/agent-listing.entity';
import { DatabaseService } from '@/core/database/database.service';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

import { In, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { PujaAppointment } from '@/modules/puja-appointment/infrastructure/entities/puja-appointment.entity';
import { Order } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Controller({
    path: 'agent',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('AGENT')
export class AgentController {
    constructor(
        private readonly db: DatabaseService,
        private readonly configService: ConfigService,
        private readonly walletFacade: WalletFacade,
        private readonly notificationFacade: NotificationFacade,
    ) { }

    @Get('profile')
    async getProfile(@CurrentUser() user: User) {
        const profile = await this.db.transaction(async (queryRunner) => {
            return queryRunner.manager.findOne(ProfileAgent, {
                where: { user_id: user.id },
                relations: ['user'] as any
            });
        });

        if (!profile) return null;

        // Flatten user details into the profile for easier frontend consumption
        return {
            ...profile,
            name: profile.user?.name,
            email: profile.user?.email,
            uid: profile.user?.uid,
        };
    }

    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: User,
        @Body() body: any
    ) {
        await this.db.transaction(async (queryRunner) => {
            const currentProfile = await queryRunner.manager.findOne(ProfileAgent, { where: { user_id: user.id } });
            
            // Check if bank details are changing
            const bankDetailsChanged = 
                body.bank_name !== currentProfile?.bank_name ||
                body.account_number !== currentProfile?.account_number ||
                JSON.stringify(body.bank_accounts) !== JSON.stringify(currentProfile?.bank_accounts);

            await queryRunner.manager.update(ProfileAgent, { user_id: user.id }, {
                bank_name: body.bank_name,
                account_number: body.account_number,
                ifsc_code: body.ifsc_code,
                account_holder: body.account_holder,
                bank_accounts: body.bank_accounts,
            });

            if (bankDetailsChanged) {
                await this.notificationFacade.create(
                    user.id,
                    NotificationType.GENERAL,
                    'Security Alert: Bank Details Updated',
                    'Your bank account information has been updated. If you did not make this change, please contact support immediately for security.',
                    { type: 'security_alert', timestamp: new Date() }
                );
            }
        });
        return { success: true };
    }

    @Get('dashboard/stats')
    async getStats(
        @CurrentUser() user: User,
        @Query('range') range: string = '30d',
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        console.log('--- STATS PARAMS RECEIVED ---', { range, startDate, endDate });

        return this.db.transaction(async (queryRunner) => {
            const profile = await queryRunner.manager.findOne(ProfileAgent, {
                where: { user_id: user.id }
            });

            let fromDate = "NOW() - INTERVAL '30 days'";
            let chartInterval = "INTERVAL '30 days'";
            let revenueInterval = "INTERVAL '6 months'";

            if (range === '7d') {
                fromDate = "NOW() - INTERVAL '7 days'";
                chartInterval = "INTERVAL '7 days'";
            } else if (range === '6m') {
                fromDate = "NOW() - INTERVAL '6 months'";
                chartInterval = "INTERVAL '6 months'";
            } else if (range === '1y') {
                fromDate = "NOW() - INTERVAL '1 year'";
                chartInterval = "INTERVAL '1 year'";
            } else if (range === 'custom' && startDate && endDate) {

                fromDate = `'${startDate}'::date`;
                const end = `'${endDate}'::date`;
                chartInterval = `AGE(${end}, ${fromDate})`;
            }

            console.log('--- CALCULATED FROM DATE ---', fromDate);


            // Filter out any nulls or non-numeric values that might have crept into the arrays
            const registeredUserIds = (profile?.registered_user_ids || []).filter(id => id && typeof id === 'number');
            const registeredAstrologerIds = (profile?.registered_astrologer_ids || []).filter(id => id && typeof id === 'number');
            const allRegisteredIds = Array.from(new Set([...registeredUserIds, ...registeredAstrologerIds]));

            const totalUsersQuery = queryRunner.manager
                .createQueryBuilder(User, 'u')
                .where('u.referred_by_id = :agentId', { agentId: user.id })
                .andWhere('u.created_at >= ' + fromDate);

            if (allRegisteredIds.length > 0) {
                totalUsersQuery.orWhere('(u.id IN (:...ids) AND u.created_at >= ' + fromDate + ')', { ids: allRegisteredIds });
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
                .leftJoinAndMapOne('u.profile_expert', ProfileExpert, 'pe', 'pe.user_id = u.id')
                .leftJoinAndMapOne('u.profile_client', ProfileClient, 'pc', 'pc.user_id = u.id')
                .leftJoinAndMapOne('u.profile_merchant', ProfileMerchant, 'pm', 'pm.user_id = u.id')
                .where('u.referred_by_id = :agentId', { agentId: user.id })
                .andWhere('u.created_at >= ' + fromDate);

            if (allRegisteredIds.length > 0) {
                qbUsers.orWhere('(u.id IN (:...ids) AND u.created_at >= ' + fromDate + ')', { ids: allRegisteredIds });
            }


            const usersForStats = await qbUsers.getMany();

            const settings = await queryRunner.manager.find(SystemSetting, {
                where: {
                    key: In([
                        'COMMISION_FROM_CLIENT', 'COMMISSION_FROM_CLIENT',
                        'COMMISION_FROM_ASTROLOGER', 'COMMISSION_FROM_ASTROLOGER',
                        'COMMISION_FROM_PUJA_SHOP', 'COMMISSION_FROM_PUJA_SHOP'
                    ])
                }
            });

            const getGlobalSetting = (keys: string[], defaultValue: number) => {
                const setting = settings.find(s => keys.includes(s.key));
                return setting ? parseFloat(setting.value) : defaultValue;
            };

            const expertCommPercent = getGlobalSetting(['COMMISION_FROM_ASTROLOGER', 'COMMISSION_FROM_ASTROLOGER'], 3);
            const clientCommPercent = getGlobalSetting(['COMMISION_FROM_CLIENT', 'COMMISSION_FROM_CLIENT'], 3);
            const shopCommPercent = getGlobalSetting(['COMMISION_FROM_PUJA_SHOP', 'COMMISSION_FROM_PUJA_SHOP'], 3);

            let expertEarnings = 0;
            let shopEarnings = 0;
            let mandirEarnings = 0;
            let clientEarnings = 0;
            let astrologersCount = 0;
            let clientsCount = 0;
            let merchantsAsPujaShopCount = 0;
            let usersWithActivity = 0;

            usersForStats.forEach(uObj => {
                const u: any = uObj;
                const roles = u.roles || [];
                const isExpert = roles.includes(RoleEnum.EXPERT);
                const isMerchant = roles.includes(RoleEnum.MERCHANT);

                if (isExpert) astrologersCount++;
                else if (isMerchant) merchantsAsPujaShopCount++;
                else clientsCount++;

                let hasActivity = false;
                if (u.profile_expert && Number(u.profile_expert.total_earning || 0) > 0) hasActivity = true;
                if (u.profile_merchant && Number((u as any).profile_merchant?.total_sales || 0) > 0) hasActivity = true;
                if (u.profile_client && Number(u.profile_client.total_spending || 0) > 0) hasActivity = true;
                
                if (hasActivity) usersWithActivity++;
            });

            // Fetch actual commission sums from sessions for accurate stats
            const roleStats = await queryRunner.manager.query(`
                SELECT 
                    u.role_name,
                    SUM(s.agent_commission)::float as total_comm
                FROM (
                    SELECT expert_id, agent_id, agent_commission FROM consultations.chat_sessions WHERE agent_id = $1
                    UNION ALL
                    SELECT expert_id, agent_id, agent_commission FROM consultations.call_sessions WHERE agent_id = $1
                ) s
                JOIN (
                    SELECT pe.id as expert_id, unnest(u.roles) as role_name
                    FROM expert.profile pe
                    JOIN public.users u ON u.id = pe.user_id
                ) u ON u.expert_id = s.expert_id
                GROUP BY u.role_name
            `, [user.id]);

            expertEarnings = roleStats.find(r => r.role_name === 'expert')?.total_comm || 0;
            // Add other role earnings if needed (merchants, etc.)
            // shopEarnings = roleStats.find(r => r.role_name === 'merchant')?.total_comm || 0;

            const currentBalance = await this.walletFacade.getBalance(user.id);
            const withdrawalStats = await this.walletFacade.getWithdrawalsStatus(user.id);

            // 1. Calculate Real Revenue Growth (Last 6 Months or Range)
            const revenueGrowthRaw = await queryRunner.manager.query(`
                SELECT 
                    TO_CHAR(t.created_at, 'Mon') as name, 
                    SUM(t.amount)::float as value,
                    TO_CHAR(t.created_at, 'MM') as month_num
                FROM finance.transactions t
                JOIN finance.wallets w ON t.wallet_id = w.id
                WHERE w.user_id = $1 AND t.purpose = 'agent_commission'
                AND t.created_at >= ${fromDate}
                GROUP BY name, month_num
                ORDER BY month_num ASC
            `, [user.id]);

            // 2. Calculate Real Registration Activity (Based on Range)
            const regInterval = range === '7d' ? '6 days' : range === '6m' ? '180 days' : '29 days';
            const registrationActivityRaw = await queryRunner.manager.query(`
                SELECT 
                    ${range === '6m' || range === '1y' ? "TO_CHAR(d.day, 'Mon')" : "TO_CHAR(d.day, 'Dy')"} as day,
                    COUNT(u.id) + COUNT(al.id) as count,
                    d.day as date_val
                FROM (
                    SELECT generate_series(${fromDate}, NOW(), '1 day')::date as day
                ) d
                LEFT JOIN public.users u ON u.created_at::date = d.day AND u.referred_by_id = $1
                LEFT JOIN agent.listings al ON al.created_at::date = d.day AND al.agent_id = $1
                GROUP BY d.day, day
                ORDER BY d.day ASC
            `, [user.id]);

            // 3. Calculate Total Earned for the selected period
            const totalEarnedRange = await queryRunner.manager.query(`
                SELECT SUM(t.amount)::float as total
                FROM finance.transactions t
                JOIN finance.wallets w ON t.wallet_id = w.id
                WHERE w.user_id = $1 AND t.purpose = 'agent_commission'
                AND t.created_at >= ${fromDate}
            `, [user.id]);

            // Calculate Rank based on total_earnings comparison with other agents
            const agentsWithHigherEarnings = await queryRunner.manager.count(ProfileAgent, {
                where: {
                    total_earnings: MoreThan(Number(profile?.total_earnings || 0))
                }
            });
            const agentRank = `#${agentsWithHigherEarnings + 1}`;





            const stats = {
                totalListings: totalUsers + totalMandirs + totalPujaShops,
                activeListings: totalUsers,
                totalUsers, // Map to Total Registration
                expertsCount: astrologersCount,
                clientsCount,
                mandirsCount: totalMandirs,
                pujaShopsCount: totalPujaShops + merchantsAsPujaShopCount,
                pendingPayout: withdrawalStats.pendingAmount,
                totalWithdrawn: withdrawalStats.totalWithdrawn,
                processingWithdrawals: withdrawalStats.processingAmount + withdrawalStats.approvedAmount,

                totalEarned: Number(totalEarnedRange[0]?.total || 0),
                commissionEarned: Number(totalEarnedRange[0]?.total || 0),
                expertEarnings: Number(expertEarnings.toFixed(2)),
                shopEarnings: Number(shopEarnings.toFixed(2)),
                mandirEarnings: Number(mandirEarnings.toFixed(2)),
                clientEarnings: Number(clientEarnings.toFixed(2)),
                totalListingsEarnings: Number((expertEarnings + shopEarnings + mandirEarnings).toFixed(2)),
                successRate: totalUsers > 0 ? ((usersWithActivity / totalUsers) * 100).toFixed(1) + "%" : "0%",
                rank: agentRank,
                revenueGrowth: revenueGrowthRaw.length > 0 ? revenueGrowthRaw : [
                    { name: "No Data", value: 0 }
                ],
                registrationActivity: registrationActivityRaw.map(r => ({
                    day: r.day,
                    count: Number(r.count || 0)
                })),
                commissionRates: {
                    expert: expertCommPercent,
                    client: clientCommPercent,
                    shop: shopCommPercent,
                    mandir: shopCommPercent // Usually same as shop/merchant for now
                },
                recentActivity: [
                    ...usersForStats.slice(0, 5).map(u => ({
                        id: u.id,
                        name: u.name,
                        type: (u.roles || [])[0] || 'User',
                        date: u.created_at,
                        action: 'Registration'
                    })),
                    ...(await queryRunner.manager.find(AgentListing, {
                        where: { agent_id: user.id },
                        order: { created_at: 'DESC' },
                        take: 5
                    })).map(al => ({
                        id: al.id,
                        name: al.name,
                        type: al.type,
                        date: al.created_at,
                        action: 'Listing'
                    }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
            };





            console.log('--- AGENT DASHBOARD STATS ---', JSON.stringify(stats, null, 2));
            return stats;
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
            const agentProfile = await queryRunner.manager.findOne(ProfileAgent, {
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
                    .leftJoinAndMapOne('u.profile_expert', ProfileExpert, 'pe', 'pe.user_id = u.id')
                    .leftJoinAndMapOne('u.profile_client', ProfileClient, 'pc', 'pc.user_id = u.id')
                    .leftJoinAndMapOne('u.profile_merchant', ProfileMerchant, 'pm', 'pm.user_id = u.id')
                    .where('u.referred_by_id = :agentId', { agentId: user.id });

                if (allRegisteredIds.length > 0) {
                    qb.orWhere('u.id IN (:...ids)', { ids: allRegisteredIds });
                }

                if (type === 'astrologer' || type === 'expert') {
                    qb.andWhere(':role = ANY(u.roles)', { role: 'expert' });
                } else if (type === 'client') {
                    qb.andWhere(':role = ANY(u.roles)', { role: 'client' });
                } else if (type === 'puja_shop' || type === 'merchant') {
                    qb.andWhere(':role = ANY(u.roles)', { role: 'merchant' });
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

                const getSettingValue = (keys: string | string[], defaultValue: number) => {
                    const keysArray = Array.isArray(keys) ? keys : [keys];
                    const setting = settings.find(s => keysArray.includes(s.key));
                    return setting ? parseFloat(setting.value) : defaultValue;
                };

                const expertCommPercent = agentProfile?.commission_rate ? Number(agentProfile.commission_rate) : getSettingValue(['COMMISSION_FROM_ASTROLOGER', 'COMMISION_FROM_ASTROLOGER'], 3);
                const clientCommPercent = agentProfile?.commission_rate ? Number(agentProfile.commission_rate) : getSettingValue(['COMMISSION_FROM_CLIENT', 'COMMISION_FROM_CLIENT'], 3);
                const merchantCommPercent = agentProfile?.commission_rate ? Number(agentProfile.commission_rate) : getSettingValue(['COMMISSION_FROM_PUJA_SHOP', 'COMMISION_FROM_PUJA_SHOP'], 3);

                // Fetch actual commission sums from sessions for accuracy
                const actualStats = await queryRunner.manager.query(`
                    SELECT 
                        expert_id, 
                        SUM(total_cost)::float as total_gross, 
                        SUM(agent_commission)::float as total_commission
                    FROM (
                        SELECT expert_id, total_cost, agent_commission FROM consultations.chat_sessions WHERE agent_id = $1
                        UNION ALL
                        SELECT expert_id, total_cost, agent_commission FROM consultations.call_sessions WHERE agent_id = $1
                    ) as s
                    GROUP BY expert_id
                `, [user.id]);

                userData = users.map(uObj => {
                    const u: any = uObj;
                    const roles = u.roles || [];
                    const isExpert = roles.includes(RoleEnum.EXPERT);
                    const isMerchant = roles.includes(RoleEnum.MERCHANT);

                    let commission = 0;
                    let totalRevenue = 0;
                    let individualCommPercent = 3;

                    if (isExpert && u.profile_expert) {
                        individualCommPercent = u.profile_expert.agent_commission_rate || 0;
                        const stats = actualStats.find(s => s.expert_id === u.profile_expert?.id);
                        commission = stats ? stats.total_commission : 0;
                        totalRevenue = stats ? stats.total_gross : 0;
                    } else if (isMerchant && (u as any).profile_merchant) {
                        individualCommPercent = (u as any).profile_merchant.agent_commission_rate || 0;
                        commission = (Number((u as any).profile_merchant.total_sales || 0) * individualCommPercent) / 100;
                        totalRevenue = Number((u as any).profile_merchant.total_sales || 0);
                    } else if (u.profile_client) {
                        individualCommPercent = 0;
                        commission = (Number(u.profile_client.total_spending || 0) * individualCommPercent) / 100;
                        totalRevenue = Number(u.profile_client.total_spending || 0);
                    }

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
                        totalRevenue: Number(totalRevenue.toFixed(2)),
                        commission: Number(commission.toFixed(2)),
                        commissionPercent: individualCommPercent
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
        const offset = (page - 1) * limit;
        const result = await this.walletFacade.getTransactions(user.id, limit, offset, 'all', 'agent_commission');

        const resolvedData = await this.db.transaction(async (queryRunner) => {
            return await Promise.all(result.data.map(async (t) => {
                let listing = 'Unknown';
                let type: string = t.purpose || 'commission';
                const refId = t.reference_id || '';

                try {
                    if (refId.startsWith('call_')) {
                        const callId = parseInt(refId.replace('call_', ''));
                        const call = await queryRunner.manager.findOne(CallSession, {
                            where: { id: callId },
                            relations: ['expert', 'expert.user']
                        });
                        if (call) {
                            listing = call.expert?.user?.name || 'Expert';
                            type = call.type === 'video' ? 'video_call' : 'audio_call';
                        }
                    } else if (refId.startsWith('chat_')) {
                        const chatId = parseInt(refId.replace('chat_', ''));
                        const chat = await queryRunner.manager.findOne(ChatSession, {
                            where: { id: chatId },
                            relations: ['expert', 'expert.user']
                        });
                        if (chat) {
                            listing = chat.expert?.user?.name || 'Expert';
                            type = 'chat';
                        }
                    } else if (refId.startsWith('puja_')) {
                        const pujaId = parseInt(refId.replace('puja_', ''));
                        const puja = await queryRunner.manager.findOne(PujaAppointment, {
                            where: { id: pujaId },
                            relations: ['expert', 'expert.user', 'puja']
                        });
                        if (puja) {
                            listing = puja.expert?.user?.name || 'Expert';
                            type = 'puja_service';
                        }
                    } else if (refId.startsWith('order_')) {
                        // For product orders, we might need to find which shop/merchant it belongs to
                        // This usually requires checking order items or a direct relation
                        type = 'puja_shop';
                    }
                } catch (err) {
                    console.error('Error resolving commission detail:', err);
                }

                return {
                    ...t,
                    listing,
                    type,
                    date: t.created_at,
                    status: (t as any).status === 'completed' ? 'paid' : (t as any).status || 'paid'
                };
            }));
        });

        return {
            data: resolvedData,
            total: result.meta.totalCount,
            page: page,
            limit: result.meta.limit
        };
    }

    // ── Wallet / Payouts ──────────────────────────────────────────────────
    @Get('wallet/balance')
    async getBalance(@CurrentUser() user: User) {
        const balance = await this.walletFacade.getBalance(user.id);
        return { balance }; // Return object as expected by frontend
    }

    @Get('wallet/withdrawals')
    async getWithdrawals(@CurrentUser() user: User) {
        console.log(`[AgentController] Fetching withdrawals for user: ${user.id}`);
        try {
            const result = await this.walletFacade.getWithdrawals(user.id);
            console.log(`[AgentController] Found ${result.data.length} withdrawals`);
            return result.data;
        } catch (err) {
            console.error(`[AgentController] Error fetching withdrawals:`, err);
            throw err;
        }
    }

    @Post('wallet/withdraw')
    async requestWithdrawal(
        @CurrentUser() user: User,
        @Body('amount', ParseUUIDPipe) amount: number,
        @Body('bank_account_id') bankAccountId: string | number,
        @Ip() ip: string,
        @Headers('user-agent') ua: string,
        @Headers('x-idempotency-key') idempotencyKey: string,
    ) {
        if (amount < 500) {
            throw new BadRequestException('Minimum withdrawal amount is ₹500');
        }
        return this.walletFacade.requestWithdrawal(user.id, amount, bankAccountId, idempotencyKey, { ip, ua });
    }

    @Post('wallet/settle')
    async settleCommissions(@CurrentUser() user: User) {
        return this.db.transaction(async (queryRunner) => {
            const profile = await queryRunner.manager.findOne(ProfileAgent, {
                where: { user_id: user.id }
            });

            if (!profile) throw new BadRequestException('Agent profile not found');

            const registeredUserIds = (profile.registered_user_ids || []).filter(id => id && typeof id === 'number');
            const registeredAstrologerIds = (profile.registered_astrologer_ids || []).filter(id => id && typeof id === 'number');
            const allRegisteredIds = Array.from(new Set([...registeredUserIds, ...registeredAstrologerIds]));

            const qbUsers = queryRunner.manager
                .createQueryBuilder(User, 'u')
                .leftJoinAndMapOne('u.profile_expert', ProfileExpert, 'pe', 'pe.user_id = u.id')
                .leftJoinAndMapOne('u.profile_client', ProfileClient, 'pc', 'pc.user_id = u.id')
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

            let totalAgentCommissionCalculated = 0;
            usersForStats.forEach(uObj => {
                const u: any = uObj;
                if (u.profile_expert) {
                    const earning = Number(u.profile_expert.total_earning || 0);
                    totalAgentCommissionCalculated += (earning * expertCommPercent) / 100;
                }
                if (u.profile_client) {
                    const spending = Number(u.profile_client.total_spending || 0);
                    totalAgentCommissionCalculated += (spending * clientCommPercent) / 100;
                }
            });

            const currentBalance = await this.walletFacade.getBalance(user.id);
            const withdrawalStats = await this.walletFacade.getWithdrawalsStatus(user.id);

            // Total money already settled = current balance + total withdrawn + pending withdrawals
            const totalAlreadyPaidOut = (Number(currentBalance) || 0) +
                (Number(withdrawalStats.totalWithdrawn) || 0) +
                (Number(withdrawalStats.pendingWithdrawals) || 0);

            const amountToSettle = parseFloat((totalAgentCommissionCalculated - totalAlreadyPaidOut).toFixed(2));

            if (amountToSettle <= 0) {
                return { success: true, message: 'All commissions already settled', settledAmount: 0 };
            }

            // Credit the agent's wallet
            await this.walletFacade.credit(
                user.id,
                amountToSettle,
                'agent_commission' as any,
                'manual_settlement',
                queryRunner
            );

            // Update profile's total_earnings
            profile.total_earnings = Number(profile.total_earnings || 0) + amountToSettle;
            await queryRunner.manager.save(ProfileAgent, profile);

            return {
                success: true,
                message: `Successfully settled ₹${amountToSettle} into your wallet`,
                settledAmount: amountToSettle
            };
        });
    }
}


