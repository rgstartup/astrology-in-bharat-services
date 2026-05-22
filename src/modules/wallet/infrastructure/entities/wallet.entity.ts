import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';


@Entity({ schema: 'finance', name: 'wallets' })
export class Wallet {
  @PrimaryKeyColumn()
  id!: string;

  @OneToOne(() => ProfileClient, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient | null;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  client_id!: string | null;

  @OneToOne(() => ProfileExpert, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expert_id!: string | null;

  @OneToOne(() => ProfileMerchant, { nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: ProfileMerchant | null;

  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  merchant_id!: string | null;

  @OneToOne(() => ProfileAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent!: ProfileAgent | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agent_id!: string | null;

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

  @CreateDateColumn({ name: 'created_at', type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
