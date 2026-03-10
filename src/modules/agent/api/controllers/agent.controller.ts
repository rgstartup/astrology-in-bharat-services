import { Controller, Get, UseGuards, Patch, Body, Post, Query, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { AgentProfile } from '../../infrastructure/persistence/entities/agent-profile.entity';
import { AgentListing } from '../../infrastructure/persistence/entities/agent-listing.entity';
import { DatabaseService } from '@/core/database/database.service';

@Controller({
    path: 'agent',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent')
export class AgentController {
    constructor(private readonly db: DatabaseService) { }

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

            // Count total users (astrologers + clients) referred by this agent
            const totalUsers = await queryRunner.manager.count(User, {
                where: { referred_by_id: user.id }
            });

            // Count mandir/puja_shop listings by this agent
            const totalMandirs = await queryRunner.manager.count(AgentListing, {
                where: { agent_id: user.id, type: 'mandir' }
            });
            const totalPujaShops = await queryRunner.manager.count(AgentListing, {
                where: { agent_id: user.id, type: 'puja_shop' }
            });

            return {
                totalListings: totalUsers + totalMandirs + totalPujaShops,
                activeListings: totalUsers, // For now, assume all referred users are active
                pendingPayouts: 0,
                totalEarnings: profile?.total_earnings || 0,
                totalMandirs,
                totalPujaShops,
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

            // ── Fetch referred users (astrologer / client) ──
            if (isUserType || isAll) {
                const qb = queryRunner.manager
                    .createQueryBuilder(User, 'u')
                    .leftJoinAndSelect('u.roles', 'role')
                    .leftJoinAndSelect('u.profile_expert', 'pe')
                    .leftJoinAndSelect('u.profile_client', 'pc')
                    .where('u.referred_by_id = :agentId', { agentId: user.id });

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
                userTotal = total;
                userData = users.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    phone: (u as any).profile_client?.phone || (u as any).profile_expert?.phone || null,
                    status: 'active',
                    type: (u.roles || []).some(r => r.name === 'expert') ? 'astrologer' : 'client',
                    createdAt: u.created_at,
                    avatar: u.avatar ?? null,
                }));
            }

            // ── Fetch mandir / puja_shop listings ──
            if (isPlaceType || isAll) {
                const qb = queryRunner.manager
                    .createQueryBuilder(AgentListing, 'al')
                    .where('al.agent_id = :agentId', { agentId: user.id });

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

