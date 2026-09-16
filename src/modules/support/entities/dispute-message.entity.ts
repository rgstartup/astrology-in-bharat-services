import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

@Entity({ schema: 'support', name: 'support_dispute_messages' })
export class DisputeMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Dispute)
  @JoinColumn({ name: 'dispute_id' })
  dispute!: Dispute;

  @Column({ name: 'dispute_id', type: 'int' })
  dispute_id!: number;

  @ManyToOne(() => ClientAccount, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount | null;

  @Column({ name: 'client_id', type: 'int', nullable: true })
  client_id!: number | null;

  @ManyToOne(() => ProfileExpert, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'expert_id', type: 'int', nullable: true })
  expert_id!: number | null;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user',
  })
  sender_type!: 'user' | 'admin';

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
