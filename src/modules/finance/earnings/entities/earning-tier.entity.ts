import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EarningPolicy } from './earning-policy.entity';

@Entity({ schema: 'finance', name: 'earning_tiers' })
export class EarningTier {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'policy_id', type: 'int' })
  policy_id!: number;

  @ManyToOne(() => EarningPolicy, (policy) => policy.tiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policy_id' })
  policy!: EarningPolicy;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  min_threshold!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_threshold!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platform_rate!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  agent_rate!: number;
}
