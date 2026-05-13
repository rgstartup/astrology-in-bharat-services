import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ChatSession } from '@/modules/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/entities/call-session.entity';
import { Order } from '@/modules/order/infrastructure/entities/order.entity';

@Entity({ schema: 'consultations', name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', name: 'order_id', nullable: true })
  order_id!: number | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;

  @Column({ type: 'int', name: 'expert_id', nullable: true })
  expert_id!: number | null;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert;

  @Column({ type: 'int', name: 'merchant_id', nullable: true })
  merchant_id!: number | null;

  @ManyToOne(() => ProfileMerchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: ProfileMerchant;

  @Column({ type: 'int', nullable: true, name: 'session_id' })
  session_id!: number | null;

  @ManyToOne(() => ChatSession, { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session!: ChatSession;

  @Column({ type: 'int', nullable: true, name: 'call_session_id' })
  call_session_id!: number | null;

  @ManyToOne(() => CallSession, { nullable: true })
  @JoinColumn({ name: 'call_session_id' })
  callSession!: CallSession;

  @Column({ type: 'float' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string;
  
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'varchar', length: 20, default: 'expert', name: 'review_type' })
  review_type!: string; // 'expert' | 'merchant' | 'platform'

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
