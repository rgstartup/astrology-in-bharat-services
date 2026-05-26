import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { Coupon } from './coupon.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'commerce', name: 'user_coupons' })
export class UserCoupon {
    @UuidPrimaryKeyColumn()
    id!: string;

    @ManyToOne(() => ProfileClient)
    @JoinColumn({ name: 'client_id' })
    client!: ProfileClient;

    @Column({ name: 'client_id', type: 'uuid' })
    client_id!: string;

    @ManyToOne(() => Coupon)
    @JoinColumn({ name: 'coupon_id' })
    coupon!: Coupon;

    @Column({ name: 'coupon_id', type: 'uuid' })
    coupon_id!: string;

    @Column({ type: 'boolean', default: false, name: 'is_used' })
    is_used!: boolean;

    @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
    used_at!: Date;

    @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
    assigned_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;
}
