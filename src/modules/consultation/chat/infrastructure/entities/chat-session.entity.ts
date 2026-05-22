import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

export enum ChatSessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'consultations', name: 'chat_sessions' })
export class ChatSession {
  @PrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ProfileClient)
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient;

  @Column({ type: 'uuid', name: 'client_id' })
  client_id!: string;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert;

  @Column({ type: 'uuid', name: 'expert_id' })
  expert_id!: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'start_time' })
  start_time!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'end_time' })
  end_time!: Date;

  @Column({
    type: 'enum',
    enum: ChatSessionStatus,
    default: ChatSessionStatus.PENDING,
  })
  status!: ChatSessionStatus;

  @Column({ type: 'text', nullable: true, name: 'terminated_by' })
  terminated_by!: string | null;

  @Column({ type: 'text', nullable: true, name: 'terminated_reason' })
  terminated_reason!: string | null;

  @Column({ type: 'text', default: 'chat', name: 'session_type' })
  session_type!: string;

  @Column({ type: 'boolean', default: false, name: 'is_recording' })
  is_recording!: boolean;

  @Column({ type: 'text', default: 'excellent', name: 'connection_quality' })
  connection_quality!: string;

  @Column({ type: 'boolean', default: false, name: 'is_free' })
  is_free!: boolean;

  @Column({ type: 'int', default: 0, name: 'free_minutes' })
  free_minutes!: number;

  @Column({ type: 'float', default: 0, name: 'price_per_minute' })
  price_per_minute!: number;

  @Column({ type: 'float', default: 0, name: 'total_cost' })
  total_cost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'expert_earning', transformer: new ColumnNumericTransformer() })
  expert_earning!: number;

  @Column({ type: 'uuid', nullable: true, name: 'agent_id' })
  agent_id?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'agent_commission', transformer: new ColumnNumericTransformer() })
  agent_commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'platform_fee', transformer: new ColumnNumericTransformer() })
  platform_fee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'gst', transformer: new ColumnNumericTransformer() })
  gst!: number;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: any;

  @Column({ type: 'int', default: 0, name: 'max_duration_seconds' })
  max_duration_seconds!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
