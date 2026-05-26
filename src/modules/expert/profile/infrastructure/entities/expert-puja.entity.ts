import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { ProfileExpert } from './profile-expert.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'expert', name: 'pujas' })
export class ExpertPuja {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ProfileExpert, (expert) => expert.pujas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert;

  @Column({ name: 'expert_id', type: 'uuid' })
  expert_id!: string;

  @Column({ type: 'bool', default: false })
  is_online!: boolean;

  @Column({ type: 'bool', default: false })
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
  samagri_list!: { name: string; quantity: string; }[] | null;

  @Column({ type: 'int', default: 0 })
  total_likes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
