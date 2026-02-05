import { Coupon } from '../entities/coupon.entity';

export interface ICouponRepository {
    findByCode(code: string): Promise<Coupon | null>;
    findById(id: number): Promise<Coupon | null>;
    save(coupon: Coupon): Promise<Coupon>;
    create(couponData: Partial<Coupon>): Coupon;
    remove(coupon: Coupon): Promise<Coupon>;
    findAll(isActive?: boolean): Promise<Coupon[]>;
    count(isActive?: boolean): Promise<number>;
}

export const ICouponRepository = Symbol('ICouponRepository');
