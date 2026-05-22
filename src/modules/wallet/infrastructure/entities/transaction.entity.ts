import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  HOLD = 'hold',
  RELEASE = 'release',
}

export enum TransactionPurpose {
  RECHARGE = 'recharge',
  CONSULTATION = 'consultation',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  PRODUCT_PURCHASE = 'product_purchase',
  PUJA_CONFIRMATION = 'puja_confirmation',
  AGENT_COMMISSION = 'agent_commission',
}

@Entity({ schema: 'finance', name: 'transactions' })
export class Transaction {
  @PrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @Column({ name: 'wallet_id', type: 'uuid' })
  wallet_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  balance_before!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  balance_after!: number | null;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: TransactionPurpose })
  purpose!: TransactionPurpose;

  @Column({ name: 'reference_id', type: 'text', nullable: true })
  reference_id!: string | null; // To link with session or external payment ID

  @Column({ name: 'transaction_no', type: 'text', nullable: true, unique: true })
  transaction_no!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
