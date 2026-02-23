import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

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
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'wallet_id' })
  wallet_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionPurpose })
  purpose: TransactionPurpose;

  @Column({ name: 'reference_id', nullable: true })
  reference_id: string; // To link with session or external payment ID

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
