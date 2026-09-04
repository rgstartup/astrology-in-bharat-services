import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ExpertAccount } from './account.entity';

@Entity({ schema: 'expert', name: 'account_pujas' })
export class ExpertAccountPuja {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ExpertAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expert_account_id' })
  account!: ExpertAccount;

  @Column({ name: 'expert_account_id', type: 'uuid' })
  expert_account_id!: string;

  @Column({ type: 'boolean', default: false })
  is_online!: boolean;

  @Column({ type: 'boolean', default: false })
  is_home_visit!: boolean;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'float', default: 0 })
  min_duration_hours!: number;

  @Column({ type: 'float', default: 0 })
  max_duration_hours!: number;

  @Column({ type: 'float', default: 0 })
  online_cost!: number;

  @Column({ type: 'float', default: 0 })
  home_visit_with_samagri_cost!: number;

  @Column({ type: 'float', default: 0 })
  home_visit_without_samagri_cost!: number;

  @Column({ type: 'text', nullable: true })
  puja_image_url!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  districts!: string[] | null;

  @Column({ type: 'json', nullable: true })
  samagri_list!: { name: string; quantity: string }[] | null;

  @Column({ type: 'int', default: 0 })
  total_likes!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
