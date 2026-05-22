import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/infrastructure/entities/call-session.entity';
import { Order } from '@/modules/commerce/order/infrastructure/entities/order.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'consultations', name: 'reviews' })
export class Review {
  @PrimaryKeyColumn()
  id!: string;

  @Column({ type: 'uuid', name: 'client_id' })
  client_id!: string;

  @ManyToOne(() => ProfileClient)
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient;

  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  order_id!: string | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;

  @Column({ type: 'uuid', name: 'expert_id', nullable: true })
  expert_id!: string | null;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert;

  @Column({ type: 'uuid', name: 'merchant_id', nullable: true })
  merchant_id!: string | null;

  @ManyToOne(() => ProfileMerchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: ProfileMerchant;

  @Column({ type: 'uuid', nullable: true, name: 'session_id' })
  session_id!: string | null;

  @ManyToOne(() => ChatSession, { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session!: ChatSession;

  @Column({ type: 'uuid', nullable: true, name: 'call_session_id' })
  call_session_id!: string | null;

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
