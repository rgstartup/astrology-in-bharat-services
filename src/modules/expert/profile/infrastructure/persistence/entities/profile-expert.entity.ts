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

import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Address } from '@/common/address/address.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { ExpertPuja } from './expert-puja.entity';

@Entity('profile_experts')
@Check(`"gender" IN ('male', 'female', 'other')`)
@Check(`"experience_in_years" >= 0`)
@Check(`"kyc_status" IN ('pending', 'approved', 'rejected')`)
export class ProfileExpert {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile_expert)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  user_id: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  gender: 'male' | 'female' | 'other';

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  date_of_birth: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  specialization: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({
    type: 'int',
    default: 0,
  })
  experience_in_years: number;

  @Column({
    type: 'int',
    default: 0,
  })
  total_likes: number;

  @Column({
    type: 'int',
    default: 0,
    name: 'total_reviews'
  })
  total_reviews: number;

  //   @Column({ type: 'decimal', nullable: true })
  //   hourlyRate?: number;
  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ default: 'pending', name: 'kyc_status' }) // pending, approved, rejected
  kyc_status: string;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejection_reason?: string | null;

  @Column({ type: 'int', default: 0, name: 'consultation_count' })
  consultation_count: number;

  @Column({ type: 'text', nullable: true })
  languages?: string;

  @Column({ type: 'text', nullable: true, name: 'phone_number' })
  phone_number?: string;

  @Column({ type: 'float', nullable: true })
  price?: number;

  @Column({ type: 'float', nullable: true })
  chat_price?: number;

  @Column({ type: 'float', nullable: true })
  call_price?: number;

  @Column({ type: 'float', nullable: true })
  video_call_price?: number;

  @Column({ type: 'float', nullable: true })
  report_price?: number;

  @Column({ type: 'float', nullable: true })
  horoscope_price?: number;

  @Column({ type: 'json', nullable: true })
  custom_services?: Record<string, any>[];

  @Column({ type: 'text', nullable: true })
  bank_details?: string;

  @Column({ type: 'json', nullable: true })
  documents?: Record<string, any>[];

  @Column({ type: 'simple-array', nullable: true })
  gallery?: string[];

  @Column({ type: 'simple-array', nullable: true })
  videos?: string[];

  @Column({ type: 'simple-array', nullable: true })
  certificates?: string[];

  @Column({ type: 'text', nullable: true })
  video?: string;

  @Column({ type: 'json', nullable: true })
  detailed_experience?: Record<string, any>[];

  @Column({ type: 'boolean', default: false })
  is_available: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => ExpertPuja, (puja) => puja.expert, {
    cascade: true,
  })
  pujas: ExpertPuja[];

  @OneToMany(() => Address, (address) => address.profile_expert, {
    cascade: true,
    eager: true,
  })
  addresses: Address[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_earning',
    transformer: new ColumnNumericTransformer(),
  })
  total_earning: number;

  @Column({ type: 'text', nullable: true, name: 'razorpay_contact_id' })
  razorpay_contact_id?: string;

  @Column({ type: 'float', nullable: true, name: 'agent_commission_rate' })
  agent_commission_rate?: number;
}
