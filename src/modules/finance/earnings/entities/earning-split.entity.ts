import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EarningEventType } from '../enums';
import { EarningPolicy } from './earning-policy.entity';

@Entity({ schema: 'finance', name: 'earning_splits' })
export class EarningSplit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'reference_id', type: 'varchar', length: 100 })
  reference_id!: string; // e.g. order_id, session_id, appointment_id

  @Column({
    type: 'enum',
    enum: EarningEventType,
    default: EarningEventType.CALL,
  })
  reference_type!: EarningEventType;

  // Financial Breakdown
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount!: number; // Total billed amount (e.g. ₹240.00)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platform_earning!: number; // Platform revenue cut (e.g. ₹20.00)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  gst_on_platform_fee!: number; // GST on platform cut

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  provider_earning!: number; // Net payout to Expert / Merchant (e.g. ₹220.00)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  seller_agent_earning!: number; // Commission paid to seller's agent

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  buyer_agent_earning!: number; // Commission paid to buyer's agent

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  referral_earning!: number; // User referral reward

  // Stakeholder References
  @Column({ name: 'client_profile_id', type: 'int', nullable: true })
  client_profile_id!: number | null;

  @Column({ name: 'provider_profile_id', type: 'int', nullable: true })
  provider_profile_id!: number | null;

  @Column({ name: 'seller_agent_profile_id', type: 'int', nullable: true })
  seller_agent_profile_id!: number | null;

  @Column({ name: 'buyer_agent_profile_id', type: 'int', nullable: true })
  buyer_agent_profile_id!: number | null;

  @Column({ name: 'beneficiary_user_id', type: 'int', nullable: true })
  beneficiary_user_id!: number | null; // Referrer / Beneficiary User ID

  // Policy Link
  @Column({ name: 'policy_id', type: 'int', nullable: true })
  policy_id!: number | null;

  @ManyToOne(() => EarningPolicy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'policy_id' })
  policy!: EarningPolicy | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
