import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PlatformFeeEventType {
  PRODUCT_ORDER = 'product_order',
  CONSULTATION_CHAT = 'consultation_chat',
  CONSULTATION_CALL = 'consultation_call',
  PUJA_SERVICE = 'puja_service',
}

export enum PlatformFeeRateType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

export enum PlatformFeeTargetRole {
  ALL = 'all',
  CLIENT = 'client',
  MERCHANT = 'merchant',
  EXPERT = 'expert',
}

@Entity({ schema: 'finance', name: 'platform_fee_policies' })
export class PlatformFeePolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({
    type: 'enum',
    enum: PlatformFeeEventType,
    default: PlatformFeeEventType.PRODUCT_ORDER,
  })
  event_type!: PlatformFeeEventType;

  @Column({
    type: 'enum',
    enum: PlatformFeeRateType,
    default: PlatformFeeRateType.FIXED,
  })
  rate_type!: PlatformFeeRateType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rate!: number; // e.g. 5.00 (₹5) or 2.50%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_order_value!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_cap!: number | null;

  @Column({
    type: 'enum',
    enum: PlatformFeeTargetRole,
    default: PlatformFeeTargetRole.ALL,
  })
  target_role!: PlatformFeeTargetRole;

  @Column({ type: 'int', nullable: true })
  target_user_id!: number | null;

  @Column({ type: 'varchar', length: 50, default: 'ALL' })
  target_audience_cohort!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  effective_from!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  effective_to!: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
