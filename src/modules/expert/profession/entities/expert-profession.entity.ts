import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { Profession } from './profession.entity';

@Entity({ schema: 'expert', name: 'expert_professions' })
@Unique(['expert_id', 'profession_id'])
export class ExpertProfession {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ExpertAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @Column({ type: 'uuid' })
  expert_id!: string;

  @ManyToOne(() => Profession, (p) => p.expert_professions, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profession_id' })
  profession!: Profession;

  @Column({ type: 'uuid' })
  profession_id!: string;

  @Column({ type: 'bool', default: false })
  is_primary!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
