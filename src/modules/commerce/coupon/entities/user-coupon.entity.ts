import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { Coupon } from './coupon.entity';

@Entity({ schema: 'commerce', name: 'user_coupons' })
@Unique(['client_id', 'coupon_id'])
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ClientAccount)
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

  @Column({ name: 'client_id', type: 'int' })
  client_id!: number;

  @ManyToOne(() => Coupon)
  @JoinColumn({ name: 'coupon_id' })
  coupon!: Coupon;

  @Column({ name: 'coupon_id', type: 'int' })
  coupon_id!: number;

  @Column({ type: 'boolean', default: false, name: 'is_used' })
  is_used!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  used_at!: Date;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assigned_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
