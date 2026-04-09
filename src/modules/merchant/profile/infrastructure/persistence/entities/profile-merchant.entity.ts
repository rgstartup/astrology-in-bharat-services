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

export enum KycStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REJECTED = 'rejected',
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

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kycStatus: KycStatus;

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

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
