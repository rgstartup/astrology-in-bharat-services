import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { OrderShipment } from './order-shipment.entity';
import { OrderPayment } from './order-payment.entity';
import { OrderAddress } from './order-address.entity';
import { OrderStatusHistory } from './order-status-history.entity';

export { OrderStatus } from '../enums/order-status.enum';
export { PaymentStatus } from '../enums/payment-status.enum';

@Entity({ schema: 'commerce', name: 'product_orders' })
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_number', type: 'varchar', length: 50, nullable: true })
  order_number!: string | null;

  @ManyToOne(() => ClientAccount)
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

  @Column({ type: 'int', name: 'client_id' })
  client_id!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status!: PaymentStatus;

  @Column({
    name: 'subtotal_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  subtotal_amount!: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discount_amount!: number;

  @Column({
    name: 'shipping_charge',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shipping_charge!: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  tax_amount!: number;

  @Column({
    name: 'platform_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  platform_fee!: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  total_amount!: number;

  @Column({
    name: 'payment_method',
    default: 'razorpay',
    type: 'character varying',
    length: 100,
  })
  payment_method!: string;

  @Column({ name: 'razorpay_order_id', type: 'text', nullable: true })
  razorpay_order_id!: string | null;

  @Column({ name: 'shipping_address', type: 'json', nullable: true })
  shipping_address: Record<string, unknown>;

  @Column({
    name: 'delivery_otp',
    type: 'character varying',
    length: 100,
    nullable: true,
  })
  delivery_otp!: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellation_reason!: string | null;

  @Column({
    name: 'coupon_code',
    type: 'character varying',
    length: 100,
    nullable: true,
  })
  coupon_code!: string | null;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customer_notes!: string | null;

  @OneToMany(() => OrderItem, (item: OrderItem) => item.order, {
    cascade: true,
  })
  items!: OrderItem[];

  @OneToMany(() => OrderShipment, (shipment: OrderShipment) => shipment.order, {
    cascade: true,
  })
  shipments!: OrderShipment[];

  @OneToMany(() => OrderPayment, (payment: OrderPayment) => payment.order, {
    cascade: true,
  })
  payments!: OrderPayment[];

  @OneToMany(() => OrderAddress, (addr: OrderAddress) => addr.order, {
    cascade: true,
  })
  addresses!: OrderAddress[];

  @OneToMany(() => OrderStatusHistory, (history: OrderStatusHistory) => history.order, {
    cascade: true,
  })
  status_history_entries!: OrderStatusHistory[];

  @Column({ name: 'status_history', type: 'jsonb', default: [] })
  status_history!: Array<{
    status: string;
    updated_by: string;
    updated_at: string;
    role: string;
  }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
