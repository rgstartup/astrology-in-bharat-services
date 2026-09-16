import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { ProfileAgent } from '@/modules/agent/entities/profile-agent.entity';
import { BankAccount } from '@/modules/expert/bank-accounts/entities/bank-account.entity';

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  SUCCESS = 'success',
  FAILED = 'failed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

@Entity({ schema: 'finance', name: 'withdrawals' })
export class Withdrawal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'withdrawal_no', type: 'text', nullable: true, unique: true })
  withdrawal_no!: string | null;

  @ManyToOne(() => ExpertAccount, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount | null;

  @Column({ type: 'int', name: 'expert_id', nullable: true })
  expert_id!: number | null;

  @ManyToOne(() => MerchantAccount, { nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantAccount | null;

  @Column({ type: 'int', name: 'merchant_id', nullable: true })
  merchant_id!: number | null;

  @ManyToOne(() => ProfileAgent, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent!: ProfileAgent | null;

  // agent_id column is already defined at line 81 as admin_id but wait, agent_id wasn't there. I'll add it here.
  @Column({ type: 'int', name: 'agent_profile_id', nullable: true })
  agent_profile_id!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount!: BankAccount | null;

  @Column({ type: 'int', name: 'bank_account_id', nullable: true })
  bank_account_id!: number | null;

  @Column({ name: 'merchant_bank_name', type: 'text', nullable: true })
  merchant_bank_name!: string | null;

  @Column({
    name: 'merchant_account_number',
    type: 'character varying',
    length: 255,
    nullable: true,
  })
  merchant_account_number!: string | null;

  @Column({
    name: 'merchant_ifsc',
    type: 'character varying',
    length: 255,
    nullable: true,
  })
  merchant_ifsc!: string | null;

  @Column({ name: 'merchant_account_holder', type: 'text', nullable: true })
  merchant_account_holder!: string | null;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status!: WithdrawalStatus;

  @Column({ nullable: true, type: 'text' })
  remark!: string | null;

  @Column({
    name: 'transaction_reference',
    type: 'text',
    unique: true,
    nullable: true,
  })
  transaction_reference!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'int', name: 'admin_id', nullable: true })
  admin_id!: number | null;

  @Column({ type: 'timestamp', name: 'approval_date', nullable: true })
  approval_date!: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ip_address!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ name: 'is_high_value', type: 'bool', default: false })
  is_high_value!: boolean;
}
