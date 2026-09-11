import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { ExpertSpecialization } from './expert-specialization.entity';

@Entity({ schema: 'expert', name: 'specializations' })
export class Specialization {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({
    type: 'text',
  })
  title!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  icon!: string | null;

  @Column({
    type: 'text',
  })
  slug!: string;

  @Column({
    type: 'bool',
    default: true,
  })
  is_active!: boolean;

  @Column({
    type: 'int',
    default: 0,
  })
  sort_order!: number;

  @OneToMany(
    () => ExpertSpecialization,
    (expertSpecialization) => expertSpecialization.specialization,
  )
  expert_specializations!: ExpertSpecialization[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
