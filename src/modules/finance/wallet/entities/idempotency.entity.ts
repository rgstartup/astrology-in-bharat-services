import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { ProfileAgent } from '@/modules/agent/entities/profile-agent.entity';

@Entity({ schema: 'finance', name: 'idempotency_keys' })
export class Idempotency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  key!: string;

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

  @ManyToOne(() => MerchantAccount, { nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantAccount | null;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id!: number | null;

  @ManyToOne(() => ProfileAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent!: ProfileAgent | null;

  @Column({ name: 'agent_id', type: 'int', nullable: true })
  agent_id!: number | null;

  @Column({ name: 'payload_hash', type: 'text', nullable: true })
  payload_hash!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  response_payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
