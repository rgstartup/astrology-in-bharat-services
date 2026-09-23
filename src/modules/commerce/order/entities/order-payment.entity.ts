import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderRefund } from './order-refund.entity';
import { PaymentTransactionStatus } from '../enums/payment-transaction-status.enum';

@Entity({ schema: 'commerce', name: 'order_payments' })
export class OrderPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  order_id!: number;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  payment_method!: string; // 'razorpay' | 'wallet' | 'split' | 'cod'

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status!: PaymentTransactionStatus;

  @Column({
    name: 'gateway_order_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  gateway_order_id!: string | null;

  @Column({
    name: 'gateway_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  gateway_payment_id!: string | null;

  @Column({ name: 'gateway_signature', type: 'text', nullable: true })
  gateway_signature!: string | null;

  @Column({ name: 'wallet_transaction_id', type: 'int', nullable: true })
  wallet_transaction_id!: number | null;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  raw_response!: Record<string, unknown> | null;

  @OneToMany(() => OrderRefund, (refund) => refund.payment)
  refunds!: OrderRefund[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
