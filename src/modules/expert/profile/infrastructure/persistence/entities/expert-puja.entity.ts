import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProfileExpert } from './profile-expert.entity';

@Entity('expert_pujas')
export class ExpertPuja {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProfileExpert, (expert) => expert.pujas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expert_id' })
  expert: ProfileExpert;

  @Column({ name: 'expert_id' })
  expert_id: number;

  @Column({
    type: 'text',
    enum: ['online', 'home_visit'],
    default: 'online',
  })
  type: 'online' | 'home_visit';

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'float', default: 0 })
  duration_hours: number;

  @Column({ type: 'float', default: 0 })
  cost: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-array', nullable: true })
  districts: string[] | null;

  @Column({ type: 'json', nullable: true })
  samagri_list: { name: string; quantity: string }[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
