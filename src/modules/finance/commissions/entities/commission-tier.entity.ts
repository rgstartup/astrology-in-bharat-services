import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { CommissionRule } from './commission-rule.entity';

@Entity({ schema: 'finance', name: 'commission_tiers' })
export class CommissionTier {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => CommissionRule, (rule) => rule.tiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rule_id' })
  rule!: CommissionRule;

  @Column({ type: 'int' })
  rule_id!: number;

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
