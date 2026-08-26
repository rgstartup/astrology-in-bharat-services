import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { Coupon } from './coupon.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { Unique } from 'typeorm';

@Entity({ schema: 'commerce', name: 'user_coupons' })
@Unique(['client_id', 'coupon_id'])
export class UserCoupon {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ClientAccount)
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

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
