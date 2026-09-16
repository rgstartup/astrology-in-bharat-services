import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { ChatSession } from '@/modules/consultation/chat/entities/chat-session.entity';
import { CallSession } from '@/modules/consultation/call/entities/call-session.entity';
import { Order } from '@/modules/commerce/order/entities/order.entity';

@Entity({ schema: 'consultations', name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'client_id' })
  client_id!: number;

  @ManyToOne(() => ClientAccount)
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

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

  @ManyToOne(() => MerchantAccount)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantAccount;

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

  @Column({
    type: 'varchar',
    length: 20,
    default: 'expert',
    name: 'review_type',
  })
  review_type!: string; // 'expert' | 'merchant' | 'platform'

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
