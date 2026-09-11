import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ExpertAccount } from './account.entity';
import { Specialization } from './specialization.entity';

@Entity({ schema: 'expert', name: 'expert_specializations' })
@Index('UQ_expert_specialization', ['expert', 'specialization'], {
  unique: true,
})
export class ExpertSpecialization {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ExpertAccount, (expert) => expert.specializations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @ManyToOne(
    () => Specialization,
    (specialization) => specialization.expert_specializations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'specialization_id' })
  specialization!: Specialization;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
