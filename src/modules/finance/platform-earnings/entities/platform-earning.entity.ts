import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlatformFeePolicy, PlatformFeeEventType } from './platform-fee-policy.entity';

export enum PlatformEarningType {
  PLATFORM_FEE = 'platform_fee',
  COMMISSION_TAKE_RATE = 'commission_take_rate',
  CONVENIENCE_FEE = 'convenience_fee',
}

@Entity({ schema: 'finance', name: 'platform_earnings' })
export class PlatformEarning {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: PlatformFeeEventType,
    default: PlatformFeeEventType.PRODUCT_ORDER,
  })
  event_type!: PlatformFeeEventType;

  @Column({ name: 'event_id', type: 'varchar', length: 100 })
  event_id!: string; // e.g. order_id, appointment_id, session_id

  @Column({
    type: 'enum',
    enum: PlatformEarningType,
    default: PlatformEarningType.PLATFORM_FEE,
  })
  earning_type!: PlatformEarningType;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  gross_amount!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  gst_amount!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  net_amount!: number;

  @Column({ name: 'policy_id', type: 'int', nullable: true })
  policy_id!: number | null;

  @ManyToOne(() => PlatformFeePolicy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'policy_id' })
  policy!: PlatformFeePolicy | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
