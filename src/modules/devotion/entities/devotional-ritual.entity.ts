import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertDevotionalRitual } from '@/modules/expert/account/entities/expert-devotional-ritual.entity';

@Entity({ schema: 'devotion', name: 'devotional_rituals' })
export class DevotionalRitual {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  title!: string; // e.g. "Rudrabhishek Puja", "Maha Mrityunjaya Jaap", "Navagraha Shanti Havan"

  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  deity!: string | null; // e.g. "Lord Shiva", "Goddess Lakshmi"

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  significance!: string | null;

  @Column({ type: 'json', nullable: true })
  default_samagri_list!: { item: string; quantity: string }[] | null;

  @Column({ type: 'float', default: 2 })
  suggested_duration_hours!: number;

  @Column({ type: 'text', nullable: true })
  icon!: string | null;

  @Column({ type: 'text', nullable: true })
  image_url!: string | null;

  @Column({ type: 'bool', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @OneToMany(
    () => ExpertDevotionalRitual,
    (expertRitual) => expertRitual.ritual,
  )
  expert_rituals!: ExpertDevotionalRitual[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
