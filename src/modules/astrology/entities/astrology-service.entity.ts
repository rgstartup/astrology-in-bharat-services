import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertAstrologyService } from '@/modules/expert/account/entities/expert-astrology-service.entity';

@Entity({ schema: 'astrology', name: 'astrology_services' })
export class AstrologyService {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  title!: string; // e.g. "Kundali Matchmaking", "Detailed Horoscope Analysis", "Numerology Name Correction"

  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  icon!: string | null;

  @Column({ type: 'text', nullable: true })
  image_url!: string | null;

  @Column({ type: 'text', nullable: true })
  delivery_type!: string | null; // e.g. "REPORT_PDF", "LIVE_CONSULTATION", "RECORDED_AUDIO"

  @Column({ type: 'int', default: 30 })
  suggested_duration_mins!: number;

  @Column({ type: 'bool', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @OneToMany(
    () => ExpertAstrologyService,
    (expertService) => expertService.service,
  )
  expert_services!: ExpertAstrologyService[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
