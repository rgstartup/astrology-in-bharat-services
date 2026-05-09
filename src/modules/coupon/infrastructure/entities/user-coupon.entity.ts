import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Coupon } from './coupon.entity';

@Entity('user_coupons')
export class UserCoupon {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    user_id: number;

    @ManyToOne(() => Coupon)
    @JoinColumn({ name: 'coupon_id' })
    coupon: Coupon;

    @Column({ name: 'coupon_id' })
    coupon_id: number;

    @Column({ type: 'boolean', default: false, name: 'is_used' })
    is_used: boolean;

    @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
    used_at: Date;

    @CreateDateColumn({ name: 'assigned_at' })
    assigned_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
