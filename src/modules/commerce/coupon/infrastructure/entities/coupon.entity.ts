import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum CouponType {
    PERCENTAGE = 'percentage',
    FLAT = 'flat',
}

export enum CouponStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    EXPIRED = 'expired',
}

@Entity({ schema: 'commerce', name: 'coupons' })
export class Coupon {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'text', unique: true })
    code!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({
        type: 'enum',
        enum: CouponType,
        default: CouponType.PERCENTAGE,
    })
    type!: CouponType;

    @Column({ type: 'float' })
    value!: number;

    @Column({ type: 'float', default: 0, name: 'min_order_value' })
    min_order_value!: number;

    @Column({ type: 'float', default: 0, name: 'max_discount' })
    max_discount!: number;

    @Column({ type: 'timestamptz', nullable: true, name: 'expiry_date' })
    expiry_date!: Date | null;

    @Column({ type: 'int', nullable: true, name: 'max_usage_limit' })
    max_usage_limit!: number | null;

    @Column({ type: 'int', default: 0, name: 'usage_count' })
    usage_count!: number;

    @Column({
        type: 'enum',
        enum: CouponStatus,
        default: CouponStatus.ACTIVE,
    })
    status!: CouponStatus;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    is_active!: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;
}
