import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { IUserCouponRepository } from '../../../domain/repositories/user-coupon.repository.interface';
import { UserCoupon } from '../../../domain/entities/user-coupon';

@Injectable()
export class TypeOrmUserCouponRepository implements IUserCouponRepository {
    constructor(
        @InjectRepository(UserCoupon)
        private readonly repository: Repository<UserCoupon>,
    ) { }

    async findAssignments(couponId: number, userIds: number[]): Promise<UserCoupon[]> {
        return this.repository.find({
            where: {
                couponId,
                userId: In(userIds),
            },
        });
    }

    async deleteByCouponId(couponId: number): Promise<void> {
        await this.repository.delete({ couponId });
    }

    async countUsedToday(): Promise<number> {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        return this.repository.count({
            where: {
                isUsed: true,
                usedAt: Between(startOfToday, endOfToday),
            },
        });
    }

    async findUnusedByUser(userId: number): Promise<UserCoupon[]> {
        return this.repository.find({
            where: { userId, isUsed: false },
            relations: ['coupon'],
        });
    }

    async findByIds(userId: number, couponId: number): Promise<UserCoupon | null> {
        return this.repository.findOne({
            where: { userId, couponId },
        });
    }

    create(data: Partial<UserCoupon>): UserCoupon {
        return this.repository.create(data);
    }

    async save(userCoupon: UserCoupon | UserCoupon[]): Promise<UserCoupon | UserCoupon[]> {
        return this.repository.save(userCoupon as any);
    }
}
