import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '@/modules/users';
import { Coupon } from './coupon.entity';

@Entity('user_coupons')
export class UserCoupon {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'coupon_id' })
    couponId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Coupon, (coupon) => coupon.userCoupons)
    @JoinColumn({ name: 'coupon_id' })
    coupon: Coupon;

    @Column({ name: 'is_used', default: false })
    isUsed: boolean;

    @CreateDateColumn({ name: 'assigned_at' })
    assignedAt: Date;

    @Column({ name: 'used_at', type: 'timestamp', nullable: true })
    usedAt: Date;
}
