import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { CommissionRule } from './commission-rule.entity';

export enum SplitReferenceType {
  CHAT = 'chat',
  CALL = 'call',
  PUJA = 'puja',
  ORDER = 'order',
}

@Entity({ schema: 'finance', name: 'commission_splits' })
export class CommissionSplit {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'text' })
  reference_id!: string;

  @Column({ type: 'enum', enum: SplitReferenceType })
  reference_type!: SplitReferenceType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  gross_amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platform_fee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  gst!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  seller_agent_commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  buyer_agent_commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  provider_net!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platform_net!: number;

  @Column({ type: 'uuid', nullable: true })
  client_profile_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  provider_profile_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  seller_agent_profile_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  buyer_agent_profile_id!: string | null;

  @ManyToOne(() => CommissionRule, { nullable: true, eager: false })
  @JoinColumn({ name: 'commission_rule_id' })
  commission_rule!: CommissionRule | null;

  @Column({ type: 'uuid', nullable: true })
  commission_rule_id!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
