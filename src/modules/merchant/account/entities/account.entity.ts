import { User } from '@/modules/users/entities/user.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';

export enum MerchantStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity({ schema: 'merchant', name: 'account' })
export class MerchantAccount {
  @UuidPrimaryKeyColumn()
  id!: string;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: true })
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

  @Column({ name: 'shop_name', type: 'text', nullable: true })
  shop_name!: string | null;

  @Column({ name: 'manager_name', type: 'text', nullable: true })
  manager_name!: string | null;

  @Column({ name: 'phone', type: 'text', nullable: true })
  phone!: string | null;

  @Column({ name: 'address', nullable: true, type: 'text' })
  address!: string | null;

  @Column({ name: 'city', type: 'text', nullable: true })
  city!: string | null;

  @Column({ name: 'pincode', type: 'text', nullable: true })
  pincode!: string | null;

  @Column({ name: 'image', type: 'text', nullable: true })
  image!: string | null;

  @Column({ name: 'video', type: 'text', nullable: true })
  video!: string | null;

  @Column({
    type: 'enum',
    enum: MerchantStatus,
    default: MerchantStatus.PENDING_VERIFICATION,
  })
  status!: MerchantStatus;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating!: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  review_count!: number;

  @Column({ type: 'text', nullable: true })
  established!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_trusted', type: 'bool', default: false })
  is_trusted!: boolean;

  @Column({ type: 'json', nullable: true })
  gallery!: string[] | null;

  @Column({ type: 'json', nullable: true })
  features!: string[] | null;

  @Column({ name: 'is_online', type: 'bool', default: true })
  is_online!: boolean;

  @Column({ type: 'text', nullable: true })
  gstin!: string | null;

  @Column({ type: 'text', nullable: true })
  pan!: string | null;

  @Column({ name: 'is_gst_exempt', type: 'bool', default: false })
  is_gst_exempt!: boolean;

  @Column({ name: 'bank_name', type: 'text', nullable: true })
  bank_name!: string | null;

  @Column({ name: 'account_holder', type: 'text', nullable: true })
  account_holder!: string | null;

  @Column({ name: 'account_number', type: 'text', nullable: true })
  account_number!: string | null;

  @Column({ type: 'text', nullable: true })
  ifsc!: string | null;

  @Column({ name: 'gst_certificate', type: 'text', nullable: true })
  gst_certificate!: string | null;

  @Column({ name: 'pan_front', type: 'text', nullable: true })
  pan_front!: string | null;

  @Column({ name: 'pan_back', type: 'text', nullable: true })
  pan_back!: string | null;

  @Column({ name: 'aadhar_front', type: 'text', nullable: true })
  aadhar_front!: string | null;

  @Column({ name: 'aadhar_back', type: 'text', nullable: true })
  aadhar_back!: string | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  is_verified!: boolean | null;

  @Column({
    name: 'operational_hours',
    type: 'text',
    nullable: true,
    default: '10:00 AM - 08:30 PM',
  })
  operational_hours!: string | null;

  @Column({
    name: 'trust_score',
    type: 'text',
    nullable: true,
    default: '99.8',
  })
  trust_score!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column({ type: 'float', nullable: true, name: 'agent_commission_rate' })
  agent_commission_rate!: number | null;

  @Column({ type: 'json', nullable: true, name: 'bank_accounts' })
  bank_accounts!: Record<string, unknown>[];

  @Column({ type: 'text', nullable: true, name: 'razorpay_contact_id' })
  razorpay_contact_id!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
