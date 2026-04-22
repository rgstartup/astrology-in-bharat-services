import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MerchantStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}


@Entity('profile_merchants')
export class ProfileMerchant {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile_merchant)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  user_id: number;

  @Column({ nullable: true })
  shopName?: string;

  @Column({ name: 'manager_name', nullable: true })
  managerName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true, type: 'text' })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  pincode?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  video?: string;

  @Column({
    type: 'enum',
    enum: MerchantStatus,
    default: MerchantStatus.PENDING_VERIFICATION,
  })
  status: MerchantStatus;


  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount: number;

  @Column({ nullable: true })
  established?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_trusted', default: false })
  isTrusted: boolean;

  @Column({ type: 'json', nullable: true })
  gallery?: string[];

  @Column({ type: 'json', nullable: true })
  features?: string[];

  @Column({ name: 'is_online', default: true })
  isOnline: boolean;

  @Column({ nullable: true })
  gstin?: string;

  @Column({ nullable: true })
  pan?: string;

  @Column({ name: 'is_gst_exempt', default: false })
  isGstExempt: boolean;

  @Column({ name: 'bank_name', nullable: true })
  bankName?: string;

  @Column({ name: 'account_holder', nullable: true })
  accountHolder?: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber?: string;

  @Column({ nullable: true })
  ifsc?: string;

  @Column({ name: 'gst_certificate', nullable: true })
  gstCertificate?: string;

  @Column({ name: 'pan_front', nullable: true })
  panFront?: string;

  @Column({ name: 'pan_back', nullable: true })
  panBack?: string;

  @Column({ name: 'aadhar_front', nullable: true })
  aadharFront?: string;

  @Column({ name: 'aadhar_back', nullable: true })
  aadharBack?: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'operational_hours', nullable: true, default: '10:00 AM - 08:30 PM' })
  operationalHours?: string;

  @Column({ name: 'trust_score', nullable: true, default: '99.8' })
  trustScore?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ type: 'float', nullable: true, name: 'agent_commission_rate' })
  agent_commission_rate?: number;
}
