import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { CommissionRule } from './commission-rule.entity';

@Entity({ schema: 'finance', name: 'commission_tiers' })
export class CommissionTier {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => CommissionRule, (rule) => rule.tiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rule_id' })
  rule!: CommissionRule;

  @Column({ type: 'uuid' })
  rule_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  from_amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  to_amount!: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 4 })
  rate!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_cap!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_cap!: number | null;
}
