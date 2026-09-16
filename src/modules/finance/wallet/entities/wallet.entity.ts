import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { ProfileAgent } from '@/modules/agent/entities/profile-agent.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';

export type WalletKey = 'client_id' | 'expert_id' | 'merchant_id' | 'agent_id';

@Entity({ schema: 'finance', name: 'wallets' })
export class Wallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ClientAccount, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount | null;

  @Column({ name: 'client_id', type: 'int', nullable: true })
  client_id!: number | null;

  @OneToOne(() => ExpertAccount, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount | null;

  @Column({ name: 'expert_id', type: 'int', nullable: true })
  expert_id!: number | null;

  @OneToOne(() => MerchantAccount, { nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantAccount | null;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id!: number | null;

  @OneToOne(() => ProfileAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent!: ProfileAgent | null;

  @Column({ name: 'agent_id', type: 'int', nullable: true })
  agent_id!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  balance!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'reserved_balance',
    transformer: new ColumnNumericTransformer(),
  })
  reserved_balance!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
