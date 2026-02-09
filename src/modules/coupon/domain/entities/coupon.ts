import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserCoupon } from './user-coupon';

export enum CouponType {
    PERCENTAGE = 'percentage',
    FLAT = 'flat',
}

export type CouponApplicableService = 'product' | 'chat' | 'call' | 'all';

@Entity('coupons')
export class Coupon {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    code: string;

    @Column({ type: 'enum', enum: CouponType })
    type: CouponType;

    @Column('decimal', { precision: 10, scale: 2 })
    value: number;

    @Column({ name: 'is_public', default: false })
    isPublic: boolean;

    @Column({ name: 'expiry_date', type: 'timestamp' })
    expiryDate: Date;

    @Column('decimal', { name: 'min_order_value', precision: 10, scale: 2, default: 0 })
    minOrderValue: number;

    @Column({ name: 'max_usage_limit', type: 'int', default: 1 })
    maxUsageLimit: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'redemptions_count', type: 'int', default: 0 })
    redemptionsCount: number;

    @Column({ name: 'applicable_to', type: 'varchar', length: 20, default: 'all' })
    applicableTo: CouponApplicableService;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.coupon)
    userCoupons?: UserCoupon[];

    // Business Logic Methods

    public isExpired(): boolean {
        return this.expiryDate < new Date();
    }

    public isUsageLimitReached(): boolean {
        return this.redemptionsCount >= this.maxUsageLimit;
    }

    public isValidForOrder(orderValue: number): boolean {
        return orderValue >= this.minOrderValue;
    }

    public isValidForService(serviceType: string): boolean {
        if (this.applicableTo === 'all') return true;

        // Normalize 'order' to 'product' as seen in original service
        const normalizeType = serviceType === 'order' ? 'product' : serviceType;
        return this.applicableTo === normalizeType;
    }

    public canBeApplied(orderValue: number, serviceType: string): void {
        if (!this.isActive) {
            throw new Error('Valid coupon not found or inactive'); // Domain error
        }
        if (this.isExpired()) {
            throw new Error('Coupon expired');
        }
        if (this.isUsageLimitReached()) {
            throw new Error('Coupon usage limit reached');
        }
        if (!this.isValidForOrder(orderValue)) {
            throw new Error(`Minimum order value is ${this.minOrderValue}`);
        }
        if (!this.isValidForService(serviceType)) {
            throw new Error(`This coupon is only valid for ${this.applicableTo} services`);
        }
    }

    public incrementRedemption(): void {
        this.redemptionsCount++;
    }
}
