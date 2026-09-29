import type { Relation } from 'typeorm';
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { TransactionPurpose, TransactionType } from '../enum';

@Entity({ schema: 'finance', name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Relation<Wallet>;

  @Column({ name: 'wallet_id', type: 'int' })
  wallet_id!: number;

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

  @Column({
    name: 'transaction_no',
    type: 'text',
    nullable: true,
    unique: true,
  })
  transaction_no!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
