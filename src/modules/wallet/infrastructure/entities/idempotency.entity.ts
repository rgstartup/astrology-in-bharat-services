import { Entity, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'finance', name: 'idempotency_keys' })
export class Idempotency {
  @PrimaryKeyColumn()
  id!: string;

  @Column({type: 'text'})
  key!: string;

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

  @ManyToOne(() => ProfileMerchant, { nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: ProfileMerchant | null;

  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  merchant_id!: string | null;

  @ManyToOne(() => ProfileAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent!: ProfileAgent | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agent_id!: string | null;

  @Column({ name: 'payload_hash', type: 'text', nullable: true })
  payload_hash!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  response_payload: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
