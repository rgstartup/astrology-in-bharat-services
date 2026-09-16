import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { Profession } from './profession.entity';

@Entity({ schema: 'expert', name: 'expert_professions' })
@Unique(['expert_id', 'profession_id'])
export class ExpertProfession {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ExpertAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @Column({ type: 'int' })
  expert_id!: number;

  @ManyToOne(() => Profession, (p) => p.expert_professions, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profession_id' })
  profession!: Profession;

  @Column({ type: 'int' })
  profession_id!: number;

  @Column({ type: 'bool', default: false })
  is_primary!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
