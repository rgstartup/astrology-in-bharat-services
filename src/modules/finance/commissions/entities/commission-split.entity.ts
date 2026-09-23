import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommissionRule } from './commission-rule.entity';

export enum SplitReferenceType {
  CHAT = 'chat',
  CALL = 'call',
  PUJA = 'puja',
  ORDER = 'order',
}

@Entity({ schema: 'finance', name: 'commission_splits' })
export class CommissionSplit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  reference_id!: string;

  @Column({ type: 'enum', enum: SplitReferenceType })
  reference_type!: SplitReferenceType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gross_amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  gst!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  seller_agent_commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  buyer_agent_commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  referral_commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  provider_net!: number;

  @Column({ type: 'int', nullable: true })
  client_profile_id!: number | null;

  @Column({ type: 'int', nullable: true })
  provider_profile_id!: number | null;

  @Column({ type: 'int', nullable: true })
  seller_agent_profile_id!: number | null;

  @Column({ type: 'int', nullable: true })
  buyer_agent_profile_id!: number | null;

  @Column({ type: 'int', nullable: true })
  beneficiary_user_id!: number | null;

  @ManyToOne(() => CommissionRule, { nullable: true, eager: false })
  @JoinColumn({ name: 'commission_rule_id' })
  commission_rule!: CommissionRule | null;

  @Column({ type: 'int', nullable: true })
  commission_rule_id!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
