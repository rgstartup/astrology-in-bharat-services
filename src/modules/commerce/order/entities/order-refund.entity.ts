import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderPayment } from './order-payment.entity';
import { RefundDestination } from '../enums/refund-destination.enum';
import { RefundStatus } from '../enums/refund-status.enum';

@Entity({ schema: 'commerce', name: 'order_refunds' })
export class OrderRefund {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  order_id!: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'payment_id', type: 'int', nullable: true })
  payment_id!: number | null;

  @ManyToOne(() => OrderPayment, (payment) => payment.refunds, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'payment_id' })
  payment!: OrderPayment | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount!: number;

  @Column({ name: 'refund_reason', type: 'text' })
  refund_reason!: string;

  @Column({
    type: 'enum',
    enum: RefundDestination,
    default: RefundDestination.SOURCE,
  })
  destination!: RefundDestination;

  @Column({ name: 'gateway_refund_id', type: 'varchar', length: 255, nullable: true })
  gateway_refund_id!: string | null;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status!: RefundStatus;

  @Column({ name: 'processed_by', type: 'int', nullable: true })
  processed_by!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
