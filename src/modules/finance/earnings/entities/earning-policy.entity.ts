import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  EarningEventType,
  EarningRateType,
  EarningAppliesRole,
} from '../enums';
import { EarningTier } from './earning-tier.entity';

@Entity({ schema: 'finance', name: 'earning_policies' })
export class EarningPolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({
    type: 'enum',
    enum: EarningEventType,
    default: EarningEventType.CALL,
  })
  event_type!: EarningEventType;

  // Platform Cut (Take-Rate or Fixed Per-Minute / Surcharge)
  @Column({
    type: 'enum',
    enum: EarningRateType,
    default: EarningRateType.FIXED,
  })
  platform_cut_type!: EarningRateType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platform_cut_value!: number; // e.g. 2.00 (₹2/min) or 10.00 (10%)

  // Buyer-facing Checkout Fee (if applicable, e.g. ₹3 on product orders)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  buyer_platform_fee!: number;

  // GST Percentage on Platform Cut
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 18.0 })
  gst_rate_percent!: number;

  // Third-Party Agent / Referral Rates
  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0 })
  seller_agent_rate!: number; // e.g. 0.05 (5%)

  @Column({ type: 'decimal', precision: 6, scale: 4, default: 0 })
  buyer_agent_rate!: number; // e.g. 0.03 (3%)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  referral_reward_amount!: number; // e.g. ₹50 or ₹100 flat reward

  // Targeting & Scope
  @Column({
    type: 'enum',
    enum: EarningAppliesRole,
    default: EarningAppliesRole.ALL,
  })
  applies_to_role!: EarningAppliesRole;

  @Column({ type: 'int', nullable: true })
  applies_to_user_id!: number | null; // Specific expert / merchant override

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_cap!: number | null;

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher priority rule takes precedence

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  effective_from!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  effective_to!: Date | null;

  @OneToMany(() => EarningTier, (tier) => tier.policy, {
    cascade: true,
    eager: true,
  })
  tiers!: EarningTier[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
