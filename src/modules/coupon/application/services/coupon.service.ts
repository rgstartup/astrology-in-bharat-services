import { Injectable, BadRequestException, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@/modules/chat/domain/entities/chat-session.entity';
import { Coupon } from '@/modules/coupon/domain/entities/coupon.entity';
import { UserCoupon } from '@/modules/coupon/domain/entities/user-coupon.entity';
import { User } from '@/modules/users/domain/entities/user.entity';
import { Transaction } from '@/modules/wallet/domain/entities/transaction.entity';
import { Wallet } from '@/modules/wallet/domain/entities/wallet.entity';
import { ICouponRepository } from '../../domain/repositories/coupon.repository.interface';
import { IUserCouponRepository } from '../../domain/repositories/user-coupon.repository.interface';
import { BulkAssignCouponDto, UserFilterDto, SpendingPeriod, UserFilterListDto } from '../dtos/bulk-assign-coupon.dto';
import { CreateCouponDto } from '../dtos/create-coupon.dto';

@Injectable()
export class CouponService {
    private readonly logger = new Logger(CouponService.name);

    constructor(
        @Inject(ICouponRepository)
        private couponRepository: ICouponRepository,
        @Inject(IUserCouponRepository)
        private userCouponRepository: IUserCouponRepository,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Transaction)
        private transactionRepository: Repository<Transaction>,
        @InjectRepository(ChatSession)
        private chatSessionRepository: Repository<ChatSession>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
    ) { }

    async create(createCouponDto: CreateCouponDto): Promise<Coupon> {
        const existing = await this.couponRepository.findByCode(createCouponDto.code);
        if (existing) {
            throw new BadRequestException('Coupon code already exists');
        }

        const expiryDate = new Date(createCouponDto.expiry_date);
        if (isNaN(expiryDate.getTime())) {
            throw new BadRequestException('Invalid expiry date');
        }

        const couponData = {
            ...createCouponDto,
            expiryDate: expiryDate,
            minOrderValue: createCouponDto.min_order_value || 0,
            maxUsageLimit: createCouponDto.max_usage_limit || 999999,
            applicableTo: createCouponDto.applicable_to || 'all',
            isActive: createCouponDto.is_active !== undefined ? createCouponDto.is_active : true,
        };

        delete (couponData as any).expiry_date;
        delete (couponData as any).min_order_value;
        delete (couponData as any).max_usage_limit;
        delete (couponData as any).applicable_to;

        const coupon = this.couponRepository.create(couponData);
        return this.couponRepository.save(coupon);
    }

    async update(id: number, updateData: any): Promise<Coupon> {
        const coupon = await this.couponRepository.findById(id);
        if (!coupon) throw new NotFoundException('Coupon not found');

        // Mapping is_active (snake_case) to isActive (camelCase)
        if (updateData.is_active !== undefined) {
            coupon.isActive = !!updateData.is_active;
            delete updateData.is_active;
        }

        // Also handle isActive if sent in camelCase
        if (updateData.isActive !== undefined) {
            coupon.isActive = !!updateData.isActive;
            delete updateData.isActive;
        }

        // Robust handling for expiry_date
        if (updateData.expiry_date !== undefined) {
            if (updateData.expiry_date && updateData.expiry_date.trim() !== "") {
                const date = new Date(updateData.expiry_date);
                if (!isNaN(date.getTime())) {
                    coupon.expiryDate = date;
                }
            }
            delete updateData.expiry_date;
        }

        // Robust handling for min_order_value
        if (updateData.min_order_value !== undefined) {
            if (updateData.min_order_value !== null && updateData.min_order_value !== "") {
                coupon.minOrderValue = Number(updateData.min_order_value);
            }
            delete updateData.min_order_value;
        }

        // Robust handling for max_usage_limit
        if (updateData.max_usage_limit !== undefined) {
            if (updateData.max_usage_limit !== null && updateData.max_usage_limit !== "") {
                coupon.maxUsageLimit = Number(updateData.max_usage_limit);
            }
            delete updateData.max_usage_limit;
        }

        // Robust handling for applicable_to
        if (updateData.applicable_to !== undefined) {
            if (updateData.applicable_to && updateData.applicable_to.trim() !== "") {
                coupon.applicableTo = updateData.applicable_to;
            }
            delete updateData.applicable_to;
        }

        Object.assign(coupon, updateData);
        return this.couponRepository.save(coupon);
    }

    async remove(id: number) {
        const coupon = await this.couponRepository.findById(id);
        if (!coupon) throw new NotFoundException('Coupon not found');

        // Also remove assignments to users
        await this.userCouponRepository.deleteByCouponId(id);

        return this.couponRepository.remove(coupon);
    }

    async findAllAdmin(isActive?: boolean) {
        return this.couponRepository.findAll(isActive);
    }

    async getAdminStats() {
        const totalCoupons = await this.couponRepository.count();
        const activeCoupons = await this.couponRepository.count(true);

        const coupons = await this.couponRepository.findAll();
        const totalRedemptions = coupons.reduce((sum, c) => sum + Number(c.redemptionsCount || 0), 0);

        const usedToday = await this.userCouponRepository.countUsedToday();

        return {
            totalCoupons,
            activeCoupons,
            totalRedemptions,
            usedToday,
        };
    }

    async assignCouponToUser(userId: number, couponCode: string): Promise<UserCoupon> {
        const coupon = await this.couponRepository.findByCode(couponCode);
        if (!coupon || !coupon.isActive) {
            throw new NotFoundException('Valid coupon not found or inactive');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const existingAssignment = await this.userCouponRepository.findByIds(userId, coupon.id);

        if (existingAssignment) {
            throw new BadRequestException('Coupon already assigned to this user');
        }

        const userCoupon = this.userCouponRepository.create({
            userId,
            couponId: coupon.id,
            isUsed: false,
        });
        return this.userCouponRepository.save(userCoupon) as Promise<UserCoupon>;
    }

    private getDateRangeForPeriod(period: SpendingPeriod): Date {
        const now = new Date();
        const d = new Date(now);
        switch (period) {
            case SpendingPeriod.LAST_MONTH:
                d.setMonth(d.getMonth() - 1);
                return d;
            case SpendingPeriod.LAST_3_MONTHS:
                d.setMonth(d.getMonth() - 3);
                return d;
            case SpendingPeriod.LAST_6_MONTHS:
                d.setMonth(d.getMonth() - 6);
                return d;
            case SpendingPeriod.ALL_TIME:
            default:
                return new Date(0); // Beginning of time
        }
    }

    async getFilteredUserIds(filters: UserFilterDto): Promise<number[]> {
        let query = this.userRepository.createQueryBuilder('user');

        if (filters.registeredAfter) {
            query = query.andWhere('user.createdAt >= :registeredAfter', {
                registeredAfter: new Date(filters.registeredAfter),
            });
        }
        if (filters.registeredBefore) {
            query = query.andWhere('user.createdAt <= :registeredBefore', {
                registeredBefore: new Date(filters.registeredBefore),
            });
        }

        if (filters.isBlocked !== undefined) {
            query = query.andWhere('user.isBlocked = :isBlocked', {
                isBlocked: filters.isBlocked,
            });
        }

        let userIds = (await query.select('user.id').getRawMany()).map(u => u.user_id);

        if (filters.minSpending !== undefined || filters.maxSpending !== undefined) {
            const periodStart = filters.spendingPeriod
                ? this.getDateRangeForPeriod(filters.spendingPeriod)
                : new Date(0);

            const spendingQuery = this.walletRepository
                .createQueryBuilder('wallet')
                .leftJoin('transactions', 'tx', 'tx.wallet_id = wallet.id')
                .select('wallet.userId', 'userId')
                .addSelect('COALESCE(SUM(CASE WHEN tx.type = \'credit\' AND tx.purpose = \'recharge\' THEN tx.amount ELSE 0 END), 0)', 'totalSpent')
                .where('tx.createdAt >= :periodStart', { periodStart })
                .groupBy('wallet.userId');

            if (filters.minSpending !== undefined) {
                spendingQuery.having('COALESCE(SUM(CASE WHEN tx.type = \'credit\' AND tx.purpose = \'recharge\' THEN tx.amount ELSE 0 END), 0) >= :minSpending', {
                    minSpending: filters.minSpending,
                });
            }
            if (filters.maxSpending !== undefined) {
                spendingQuery.andHaving('COALESCE(SUM(CASE WHEN tx.type = \'credit\' AND tx.purpose = \'recharge\' THEN tx.amount ELSE 0 END), 0) <= :maxSpending', {
                    maxSpending: filters.maxSpending,
                });
            }

            const spendingUsers = await spendingQuery.getRawMany();
            const spendingUserIds = spendingUsers.map(u => u.userId);
            userIds = userIds.filter(id => spendingUserIds.includes(id));
        }

        if (filters.minSessions !== undefined) {
            const sessionQuery = this.chatSessionRepository
                .createQueryBuilder('session')
                .select('session.userId', 'userId')
                .addSelect('COUNT(*)', 'sessionCount')
                .where('session.status = :status', { status: ChatSessionStatus.COMPLETED })
                .groupBy('session.userId')
                .having('COUNT(*) >= :minSessions', { minSessions: filters.minSessions });

            const sessionUsers = await sessionQuery.getRawMany();
            const sessionUserIds = sessionUsers.map(u => u.userId);
            userIds = userIds.filter(id => sessionUserIds.includes(id));
        }

        return userIds;
    }

    async getFilteredUserCount(filters: UserFilterDto): Promise<number> {
        const userIds = await this.getFilteredUserIds(filters);
        return userIds.length;
    }

    async getFilteredUserList(filters: UserFilterListDto) {
        const allUserIds = await this.getFilteredUserIds(filters);
        const total = allUserIds.length;

        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const start = (page - 1) * limit;
        const pagedIds = allUserIds.slice(start, start + limit);

        if (pagedIds.length === 0) {
            return { users: [], total };
        }

        const users = await this.userRepository.find({
            where: { id: In(pagedIds) },
            select: ['id', 'name', 'email', 'createdAt'],
        });

        const periodStart = filters.spendingPeriod
            ? this.getDateRangeForPeriod(filters.spendingPeriod)
            : new Date(0);

        const spending = await this.walletRepository
            .createQueryBuilder('wallet')
            .leftJoin('transactions', 'tx', 'tx.wallet_id = wallet.id')
            .select('wallet.userId', 'userId')
            .addSelect('COALESCE(SUM(CASE WHEN tx.type = \'credit\' AND tx.purpose = \'recharge\' THEN tx.amount ELSE 0 END), 0)', 'totalSpent')
            .where('wallet.userId IN (:...ids)', { ids: pagedIds })
            .andWhere('tx.createdAt >= :periodStart', { periodStart })
            .groupBy('wallet.userId')
            .getRawMany();

        const sessions = await this.chatSessionRepository
            .createQueryBuilder('session')
            .select('session.userId', 'userId')
            .addSelect('COUNT(*)', 'sessionCount')
            .where('session.userId IN (:...ids)', { ids: pagedIds })
            .andWhere('session.status = :status', { status: ChatSessionStatus.COMPLETED })
            .groupBy('session.userId')
            .getRawMany();

        const spendingMap = new Map(spending.map(s => [s.userId, Number(s.totalSpent)]));
        const sessionMap = new Map(sessions.map(s => [s.userId, Number(s.sessionCount)]));

        const resultUsers = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            totalSpending: spendingMap.get(user.id) || 0,
            sessionCount: sessionMap.get(user.id) || 0,
            registeredAt: user.createdAt,
        }));

        return { users: resultUsers, total };
    }

    async bulkAssignCoupon(dto: BulkAssignCouponDto) {
        const coupon = await this.couponRepository.findByCode(dto.couponCode);
        if (!coupon || !coupon.isActive) {
            throw new NotFoundException('Valid coupon not found or inactive');
        }

        const userIds = dto.filters
            ? await this.getFilteredUserIds(dto.filters)
            : (await this.userRepository.find({ where: { isBlocked: false } })).map(u => u.id);

        if (userIds.length === 0) {
            throw new BadRequestException('No users matched the filter criteria');
        }

        const existingAssignments = await this.userCouponRepository.findAssignments(coupon.id, userIds);

        const existingUserIds = new Set(existingAssignments.map(a => a.userId));
        const newUserIds = userIds.filter(id => !existingUserIds.has(id));

        if (newUserIds.length === 0) {
            return {
                success: true,
                message: 'All matching users already have this coupon',
                assignedCount: 0,
                couponCode: dto.couponCode,
            };
        }

        const userCoupons = newUserIds.map(userId =>
            this.userCouponRepository.create({
                userId,
                couponId: coupon.id,
                isUsed: false,
            })
        );

        await this.userCouponRepository.save(userCoupons);

        return {
            success: true,
            message: 'Coupon assigned successfully',
            assignedCount: newUserIds.length,
            couponCode: dto.couponCode,
        };
    }

    async getUserCoupons(userId: number) {
        const userCoupons = await this.userCouponRepository.findUnusedByUser(userId);

        const now = new Date();
        return userCoupons
            .filter((uc) => uc.coupon.isActive && uc.coupon.expiryDate > now)
            .map((uc) => ({
                ...uc.coupon,
                assignmentId: uc.id
            }));
    }

    async applyCoupon(code: string, userId: number, orderValue?: number, serviceType: string = 'all') {
        const coupon = await this.couponRepository.findByCode(code);

        // Debug Log
        this.logger.debug(`Applying coupon: ${code} for user: ${userId}, value: ${orderValue}, type: ${serviceType}`);

        if (!coupon || !coupon.isActive) {
            this.logger.error(`Coupon not found or inactive: ${code}`);
            throw new NotFoundException('Invalid or inactive coupon');
        }

        const now = new Date();
        if (coupon.expiryDate < now) {
            this.logger.error(`Coupon expired: ${code}`);
            throw new BadRequestException('Coupon expired');
        }

        if (orderValue !== undefined && Number(orderValue) < Number(coupon.minOrderValue)) {
            this.logger.error(`Min order value check failed: Cart ${orderValue} < Min ${coupon.minOrderValue}`);
            throw new BadRequestException(`Minimum order value is ${coupon.minOrderValue}`);
        }

        if (Number(coupon.redemptionsCount) >= Number(coupon.maxUsageLimit)) {
            this.logger.error(`Usage limit reached for coupon: ${code}`);
            throw new BadRequestException('Coupon usage limit reached');
        }

        // Service type check (Mapping 'order' to 'product' temporarily for flexibility)
        const normalizeType = serviceType === 'order' ? 'product' : serviceType;
        if (coupon.applicableTo !== 'all' && normalizeType !== 'all' && coupon.applicableTo !== normalizeType) {
            this.logger.error(`Service type mismatch: Coupon works for ${coupon.applicableTo}, but used for ${normalizeType}`);
            throw new BadRequestException(`This coupon is only valid for ${coupon.applicableTo} services`);
        }

        if (coupon.isPublic) {
            return coupon;
        }

        const assignment = await this.userCouponRepository.findByIds(userId, coupon.id);

        if (!assignment || assignment.isUsed) {
            this.logger.error(`No assignment found for user ${userId} and private coupon ${coupon.id}`);
            throw new BadRequestException('Coupon not valid for you or already used');
        }

        return coupon;
    }

    async markCouponAsUsed(code: string, userId: number) {
        try {
            const coupon = await this.couponRepository.findByCode(code);
            if (!coupon) return;

            coupon.redemptionsCount = Number(coupon.redemptionsCount || 0) + 1;
            await this.couponRepository.save(coupon);

            if (!coupon.isPublic) {
                const assignment = await this.userCouponRepository.findByIds(userId, coupon.id);
                if (assignment && !assignment.isUsed) {
                    assignment.isUsed = true;
                    assignment.usedAt = new Date();
                    await this.userCouponRepository.save(assignment);
                }
            } else {
                const userCoupon = this.userCouponRepository.create({
                    userId,
                    couponId: coupon.id,
                    isUsed: true,
                    usedAt: new Date()
                });
                await this.userCouponRepository.save(userCoupon);
            }
        } catch (error) {
            this.logger.error(`Error marking coupon ${code} as used: ${error.message}`);
        }
    }
}
