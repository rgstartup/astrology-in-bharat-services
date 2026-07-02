import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
@Entity({ schema: 'support', name: 'support_dispute_messages' })
export class DisputeMessage {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => Dispute)
  @JoinColumn({ name: 'dispute_id' })
  dispute!: Dispute;

  @Column({ name: 'dispute_id', type: 'uuid' })
  dispute_id!: string;

  @ManyToOne(() => ProfileClient, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  client_id!: string | null;

  @ManyToOne(() => ProfileExpert, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expert_id!: string | null;

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
