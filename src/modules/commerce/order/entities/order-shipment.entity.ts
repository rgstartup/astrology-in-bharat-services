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
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShipmentStatus } from '../enums/shipment-status.enum';

@Entity({ schema: 'commerce', name: 'order_shipments' })
export class OrderShipment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'shipment_number', length: 60, nullable: true })
  shipment_number!: string | null;

  @Column({ name: 'order_id', type: 'int' })
  order_id!: number;

  @ManyToOne(() => Order, (order) => order.shipments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id!: number | null;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status!: ShipmentStatus;

  @Column({
    name: 'subtotal_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  subtotal_amount!: number;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shipping_fee!: number;

  @Column({ name: 'courier_partner', type: 'varchar', length: 100, nullable: true })
  courier_partner!: string | null;

  @Column({ name: 'awb_code', type: 'varchar', length: 100, nullable: true })
  awb_code!: string | null;

  @Column({ name: 'tracking_url', type: 'text', nullable: true })
  tracking_url!: string | null;

  @Column({ name: 'delivery_otp', type: 'varchar', length: 10, nullable: true })
  delivery_otp!: string | null;

  @Column({ name: 'estimated_delivery_date', type: 'timestamptz', nullable: true })
  estimated_delivery_date!: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shipped_at!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  delivered_at!: Date | null;

  @OneToMany(() => OrderItem, (item) => item.shipment)
  items!: OrderItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
