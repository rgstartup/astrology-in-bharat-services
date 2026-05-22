// @ts-nocheck
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Coupon, CouponStatus } from '@/modules/commerce/coupon/infrastructure/entities/coupon.entity';
import { UserCoupon } from '@/modules/commerce/coupon/infrastructure/entities/user-coupon.entity';
import { GetFilteredUsersUseCase, FilterCriteria } from './get-filtered-users.use-case';

@Injectable()
export class AssignCouponBulkUseCase {
    private readonly logger = new Logger(AssignCouponBulkUseCase.name);

    constructor(
        @InjectRepository(Coupon)
        private readonly couponRepo: Repository<Coupon>,
        @InjectRepository(UserCoupon)
        private readonly userCouponRepo: Repository<UserCoupon>,
        private readonly getFilteredUsersUseCase: GetFilteredUsersUseCase,
        private readonly dataSource: DataSource,
    ) { }

    async execute(couponCode: string, filters: FilterCriteria) {
        // 1. Find the coupon
        const coupon = await this.couponRepo.findOne({
            where: { code: couponCode, is_active: true, status: CouponStatus.ACTIVE }
        });

        if (!coupon) {
            throw new NotFoundException(`Active coupon with code "${couponCode}" not found`);
        }

        // 2. Get all matched users (without pagination limit)
        const matchedUsers = await this.getFilteredUsersUseCase.executeList({
            ...filters,
            page: 1,
            limit: 999999 // Effectively all matching users
        });

        if (matchedUsers.length === 0) {
            throw new BadRequestException('No users found matching the selected filters');
        }

        this.logger.log(`Assigning coupon ${couponCode} to ${matchedUsers.length} users bulk.`);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let assignedCount = 0;

        try {
            for (const user of matchedUsers) {
                // Check if already assigned (optional, but good for idempotency)
                const existing = await queryRunner.manager.findOne(UserCoupon, {
                    where: { user_id: user.id, coupon_id: coupon.id }
                });

                if (!existing) {
                    const userCoupon = queryRunner.manager.create(UserCoupon, {
                        user_id: user.id,
                        coupon_id: coupon.id,
                        is_used: false
                    });
                    await queryRunner.manager.save(UserCoupon, userCoupon);
                    assignedCount++;
                }
            }

            await queryRunner.commitTransaction();
            return {
                success: true,
                totalMatched: matchedUsers.length,
                assignedCount: assignedCount,
                alreadyAssigned: matchedUsers.length - assignedCount
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed bulk coupon assignment: ${error.message}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
