import { Coupon } from "../entities/coupon";

export interface ICouponRepository {
    save(coupon: Coupon | Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Coupon>;
    findByCode(code: string): Promise<Coupon | null>;
    findById(id: number): Promise<Coupon | null>;
    findAll(isActive?: boolean): Promise<Coupon[]>;
    remove(coupon: Coupon): Promise<void>;

    // Specific query for admin stats could stay here or be in a separate QueryService
    countTotal(): Promise<number>;
    countActive(): Promise<number>;
    create(data: any): Coupon;
}
