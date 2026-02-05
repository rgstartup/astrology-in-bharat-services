import { UserCoupon } from '../entities/user-coupon.entity';

export interface IUserCouponRepository {
    findByIds(userId: number, couponId: number): Promise<UserCoupon | null>;
    save(userCoupon: UserCoupon | UserCoupon[]): Promise<UserCoupon | UserCoupon[]>;
    create(data: Partial<UserCoupon>): UserCoupon;
    deleteByCouponId(couponId: number): Promise<void>;
    countUsedToday(): Promise<number>;
    findUnusedByUser(userId: number): Promise<UserCoupon[]>;
    findAssignments(couponId: number, userIds: number[]): Promise<UserCoupon[]>;
}

export const IUserCouponRepository = Symbol('IUserCouponRepository');
