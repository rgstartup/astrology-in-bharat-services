import type { Relation } from 'typeorm';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '@/shared/transformers/numeric.transformer';
import { User } from '@/internal/users/entities/user.entity';
import { Media } from '@/internal/media/entities/media.entity';
import { ExpertKycStatus } from '@/internal/actors/expert/shared/enums/kyc-status.enum';
import { ExpertSpecialization } from './expert-specialization.entity';
import { ExpertConsultationPricing } from './expert-consultation-pricing.entity';
import { ExpertProfession } from '@/internal/actors/expert/profession/entities/expert-profession.entity';
import { ExpertAstrologyService } from './expert-astrology-service.entity';

@Entity({ schema: 'expert', name: 'account' })
@Check(`"gender" IN ('male', 'female', 'other')`)
@Check(`"experience_in_years" >= 0`)
export class ExpertAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @Column({ type: 'text', unique: true, nullable: true })
  uid!: string | null;

  @Column({ type: 'boolean', default: false })
  is_blocked!: boolean;

  @Column({ type: 'character varying', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  email!: string | null;

  /**
   * @deprecated Use `avatar_id` and `avatar_media` relation instead.
   */
  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'int', nullable: true, name: 'avatar_id' })
  avatar_id!: number | null;

  @OneToOne(() => Media, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'avatar_id' })
  avatar_media!: Media | null;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true, default: 'other' })
  gender!: 'male' | 'female' | 'other';

  @Column({ type: 'timestamptz', nullable: true })
  date_of_birth!: Date | null;

  @Column({ type: 'text', nullable: true })
  specialization!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'text', nullable: true })
  about!: string | null;

  @Column({ type: 'text', nullable: true })
  languages!: string | null;

  @Column({ type: 'int', default: 0 })
  experience_in_years!: number;

  @Column({ type: 'int', default: 0 })
  total_likes!: number;

  @Column({ type: 'int', default: 0, name: 'total_reviews' })
  total_reviews!: number;

  @Column({ type: 'float', default: 0 })
  rating!: number;

  @Column({
    type: 'enum',
    enum: ExpertKycStatus,
    default: ExpertKycStatus.PENDING,
    name: 'kyc_status',
  })
  kyc_status!: ExpertKycStatus;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejection_reason?: string | null;

  @Column({ type: 'int', default: 0, name: 'consultation_count' })
  consultation_count!: number;

  @Column({ type: 'text', nullable: true, name: 'phone_number' })
  phone_number!: string | null;

  /******DO NOT USE | Soon to be Deprecated ************/
  @Column({ type: 'float', nullable: true })
  price!: number | null;

  @Column({ type: 'float', nullable: true })
  chat_price!: number | null;

  @Column({ type: 'float', nullable: true })
  call_price!: number | null;

  @Column({ type: 'float', nullable: true })
  video_call_price!: number | null;

  @Column({ type: 'float', nullable: true })
  report_price!: number | null;

  @Column({ type: 'float', nullable: true })
  horoscope_price!: number | null;
  /******DO NOT USE | Soon to be Deprecated ************/

  @Column({ type: 'json', nullable: true })
  custom_services!: Record<string, unknown>[] | null;

  @Column({ type: 'text', nullable: true })
  bank_details!: string | null;

  @Column({ type: 'json', nullable: true })
  documents!: Record<string, unknown>[] | null;

  @Column({ type: 'simple-array', nullable: true })
  gallery!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  videos!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  certificates!: string[] | null;

  /**
   * @deprecated Use `intro_video_id` and `intro_video_media` relation instead.
   * Retained for backward compatibility with legacy `video` column.
   */
  @Column({ type: 'text', nullable: true })
  video!: string | null;

  @Column({ type: 'text', nullable: true, name: 'intro_video' })
  intro_video!: string | null;

  @Column({ type: 'int', nullable: true, name: 'intro_video_id' })
  intro_video_id!: number | null;

  @OneToOne(() => Media, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'intro_video_id' })
  intro_video_media!: Media | null;

  @Column({ type: 'json', nullable: true })
  detailed_experience!: Record<string, unknown>[] | null;

  @Column({ type: 'boolean', default: false })
  is_available!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_seen_at' })
  last_seen_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  about_me!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_earning',
    transformer: new ColumnNumericTransformer(),
  })
  total_earning!: number;

  @Column({ type: 'text', nullable: true, name: 'razorpay_contact_id' })
  razorpay_contact_id!: string | null;

  @Column({ type: 'float', nullable: true, name: 'agent_commission_rate' })
  agent_commission_rate!: number | null;

  @OneToMany(
    () => ExpertSpecialization,
    (expertSpecialization) => expertSpecialization.expert,
  )
  specializations!: ExpertSpecialization[];

  @OneToMany(() => ExpertProfession, (ep) => ep.expert)
  professions!: ExpertProfession[];

  @OneToMany(() => ExpertAstrologyService, (eas) => eas.expert)
  astrology_services!: ExpertAstrologyService[];

  @OneToMany(() => ExpertConsultationPricing, (pricing) => pricing.expert)
  pricings!: ExpertConsultationPricing[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
