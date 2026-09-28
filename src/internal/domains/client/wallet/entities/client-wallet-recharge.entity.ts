import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { ClientWallet } from './client-wallet.entity';
import { ColumnNumericTransformer } from '@/shared/transformers/numeric.transformer';
import { ClientRechargeStatus } from '../enum';

@Entity({ schema: 'client', name: 'wallet_recharges' })
export class ClientWalletRecharge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'wallet_id', type: 'int' })
  wallet_id!: number;

  @ManyToOne(() => ClientWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: ClientWallet;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount!: number;

  @Column({
    name: 'bonus_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  bonus_amount!: number;

  @Column({
    name: 'gst_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  gst_amount!: number;

  @Column({
    name: 'total_payable',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  total_payable!: number;

  @Column({
    type: 'enum',
    enum: ClientRechargeStatus,
    default: ClientRechargeStatus.PENDING,
  })
  status!: ClientRechargeStatus;

  @Column({
    name: 'payment_gateway',
    type: 'varchar',
    length: 50,
    default: 'razorpay',
  })
  payment_gateway!: string;

  @Index({ unique: true })
  @Column({ name: 'gateway_order_id', type: 'text', nullable: true })
  gateway_order_id!: string | null;

  @Column({ name: 'gateway_payment_id', type: 'text', nullable: true })
  gateway_payment_id!: string | null;

  @Column({ name: 'gateway_signature', type: 'text', nullable: true })
  gateway_signature!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failure_reason!: string | null;

  @Column({ name: 'wallet_transaction_id', type: 'int', nullable: true })
  wallet_transaction_id!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
