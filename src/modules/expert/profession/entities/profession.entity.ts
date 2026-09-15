import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { Specialization } from '@/modules/expert/specialization/entities/specialization.entity';
import { ExpertProfession } from './expert-profession.entity';

@Entity({ schema: 'expert', name: 'professions' })
export class Profession {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  icon!: string | null;

  @Column({ type: 'bool', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @ManyToMany(() => Specialization, (spec) => spec.professions)
  @JoinTable({
    name: 'profession_specializations',
    schema: 'expert',
    joinColumn: { name: 'profession_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'specialization_id',
      referencedColumnName: 'id',
    },
  })
  specializations!: Specialization[];

  @OneToMany(() => ExpertProfession, (ep) => ep.profession)
  expert_professions!: ExpertProfession[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
