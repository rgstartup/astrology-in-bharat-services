import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
// import { User } from '@/modules/users/entities/user.entity';
// import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

export enum ChatSessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expert_id' })
  expert: ProfileExpert;

  @Column({ type: 'int', name: 'expert_id' })
  expert_id: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'start_time' })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'end_time' })
  end_time: Date;

  @Column({
    type: 'enum',
    enum: ChatSessionStatus,
    default: ChatSessionStatus.PENDING,
  })
  status: ChatSessionStatus;

  @Column({ type: 'text', nullable: true, name: 'terminated_by' })
  terminated_by: string | null;

  @Column({ type: 'text', nullable: true, name: 'terminated_reason' })
  terminated_reason: string | null;

  @Column({ type: 'text', default: 'chat', name: 'session_type' })
  session_type: string;

  @Column({ type: 'boolean', default: false, name: 'is_recording' })
  is_recording: boolean;

  @Column({ type: 'text', default: 'excellent', name: 'connection_quality' })
  connection_quality: string;

  @Column({ type: 'boolean', default: false, name: 'is_free' })
  is_free: boolean;

  @Column({ type: 'int', default: 0, name: 'free_minutes' })
  free_minutes: number;

  @Column({ type: 'float', default: 0, name: 'price_per_minute' })
  price_per_minute: number;

  @Column({ type: 'float', default: 0, name: 'total_cost' })
  total_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'expert_earning', transformer: new ColumnNumericTransformer() })
  expert_earning: number;

  @Column({ type: 'int', nullable: true, name: 'agent_id' })
  agent_id?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'agent_commission', transformer: new ColumnNumericTransformer() })
  agent_commission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'platform_fee', transformer: new ColumnNumericTransformer() })
  platform_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'gst', transformer: new ColumnNumericTransformer() })
  gst: number;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: any;

  @Column({ type: 'int', default: 0, name: 'max_duration_seconds' })
  max_duration_seconds: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
