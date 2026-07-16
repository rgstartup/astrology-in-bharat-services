import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { CommissionTier } from './commission-tier.entity';

export enum CommissionEventType {
  CHAT = 'chat',
  CALL = 'call',
  PUJA = 'puja',
  PRODUCT_ORDER = 'product_order',
}

export enum CommissionType {
  PLATFORM_FEE = 'platform_fee',
  SELLER_AGENT = 'seller_agent',
  BUYER_AGENT = 'buyer_agent',
  GST = 'gst',
}

export enum CommissionRateType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum CommissionAppliesRole {
  ALL = 'all',
  EXPERT = 'expert',
  MERCHANT = 'merchant',
  CLIENT = 'client',
  AGENT = 'agent',
}

@Entity({ schema: 'finance', name: 'commission_rules' })
export class CommissionRule {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: CommissionEventType })
  event_type!: CommissionEventType;

  @Column({ type: 'enum', enum: CommissionType })
  commission_type!: CommissionType;

  @Column({ type: 'decimal', precision: 6, scale: 4 })
  rate!: number;

  @Column({
    type: 'enum',
    enum: CommissionRateType,
    default: CommissionRateType.PERCENTAGE,
  })
  rate_type!: CommissionRateType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_cap!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_cap!: number | null;

  @Column({
    type: 'enum',
    enum: CommissionAppliesRole,
    default: CommissionAppliesRole.ALL,
  })
  applies_to_role!: CommissionAppliesRole;

  @Column({ type: 'uuid', nullable: true })
  applies_to_id!: string | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  effective_from!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  effective_until!: Date | null;

  @OneToMany(() => CommissionTier, (tier) => tier.rule, {
    cascade: true,
    eager: true,
  })
  tiers!: CommissionTier[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
