import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExpertSpecialization } from '@/modules/expert/account/entities/expert-specialization.entity';
import { Profession } from '@/modules/expert/profession/entities/profession.entity';

@Entity({ schema: 'expert', name: 'specializations' })
export class Specialization {
  @PrimaryGeneratedColumn()
  id!: number;

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

  @ManyToMany(() => Profession, (prof) => prof.specializations)
  professions!: Profession[];

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
