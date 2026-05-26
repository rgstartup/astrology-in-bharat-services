import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Address } from '@/common/address/address.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { ExpertPuja } from './expert-puja.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'expert', name: 'profile' })
@Check(`"gender" IN ('male', 'female', 'other')`)
@Check(`"experience_in_years" >= 0`)
@Check(`"kyc_status" IN ('pending', 'approved', 'rejected')`)
export class ProfileExpert {
  @UuidPrimaryKeyColumn()
  id!: string;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id'})
  user_id!: string;

  @Column({ type: 'text', unique: true, nullable: true })
  uid!: string | null;

  @Column({ type: 'bool', default: false })
  is_blocked!: boolean;

  @Column({ type: 'character varying', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  gender!: 'male' | 'female' | 'other';

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  date_of_birth!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  specialization!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({
    type: 'int',
    default: 0,
  })
  experience_in_years!: number;

  @Column({
    type: 'int',
    default: 0,
  })
  total_likes!: number;

  @Column({
    type: 'int',
    default: 0,
    name: 'total_reviews'
  })
  total_reviews!: number;

  @Column({ type: 'float', default: 0 })
  rating!: number;

  @Column({ default: 'pending', name: 'kyc_status' })
  kyc_status!: string;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejection_reason?: string | null;

  @Column({ type: 'int', default: 0, name: 'consultation_count' })
  consultation_count!: number;

  @Column({ type: 'text', nullable: true })
  languages!: string | null;

  @Column({ type: 'text', nullable: true, name: 'phone_number' })
  phone_number!: string | null;

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

  @Column({ type: 'json', nullable: true })
  custom_services!: Record<string, any>[] | null;

  @Column({ type: 'text', nullable: true })
  bank_details!: string | null;

  @Column({ type: 'json', nullable: true })
  documents!: Record<string, any>[] | null;

  @Column({ type: 'simple-array', nullable: true })
  gallery!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  videos!: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  certificates!: string[] | null;

  @Column({ type: 'text', nullable: true })
  video!: string | null;

  @Column({ type: 'json', nullable: true })
  detailed_experience!: Record<string, any>[] | null;

  @Column({ type: 'boolean', default: false })
  is_available!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  @OneToMany(() => ExpertPuja, (puja) => puja.expert, {
    cascade: true,
  })
  pujas!: ExpertPuja[];

  @OneToMany(() => Address, (address) => address.profile_expert, {
    cascade: true,
    eager: true,
  })
  addresses!: Address[];

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
}
