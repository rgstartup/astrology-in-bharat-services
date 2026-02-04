import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserCoupon } from './user-coupon.entity';

export enum CouponType {
    PERCENTAGE = 'percentage',
    FLAT = 'flat',
}

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
    applicableTo: 'product' | 'chat' | 'call' | 'all';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.coupon)
    userCoupons: UserCoupon[];
}
