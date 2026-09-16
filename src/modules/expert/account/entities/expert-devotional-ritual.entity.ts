import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertAccount } from './account.entity';
import { DevotionalRitual } from '@/modules/devotion/entities/devotional-ritual.entity';

@Entity({ schema: 'expert', name: 'expert_devotional_rituals' })
@Unique(['expert_id', 'ritual_id'])
export class ExpertDevotionalRitual {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ExpertAccount, (ea) => ea.devotional_rituals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @Column({ type: 'int' })
  expert_id!: number;

  @ManyToOne(() => DevotionalRitual, (r) => r.expert_rituals, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ritual_id' })
  ritual!: DevotionalRitual;

  @Column({ type: 'int' })
  ritual_id!: number;

  @Column({ type: 'float', default: 0 })
  online_price!: number;

  @Column({ type: 'float', default: 0 })
  home_visit_without_samagri_price!: number;

  @Column({ type: 'float', default: 0 })
  home_visit_with_samagri_price!: number;

  @Column({ type: 'simple-array', nullable: true })
  serviceable_districts!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  languages!: string[] | null;

  @Column({ type: 'bool', default: true })
  is_enabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
