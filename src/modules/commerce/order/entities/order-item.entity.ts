import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ProductVariant } from '@/modules/commerce/product/entities/variants.entity';
import { OrderShipment } from './order-shipment.entity';

import { OrderItemStatus } from '../enums/order-item-status.enum';
import { OrderStatus } from '../enums/order-status.enum';

@Entity({ schema: 'commerce', name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id', type: 'int' })
  order_id!: number;

  @Column({ name: 'shipment_id', type: 'int', nullable: true })
  shipment_id!: number | null;

  @ManyToOne(() => OrderShipment, (shipment) => shipment.items, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'shipment_id' })
  shipment!: OrderShipment | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product!: Product | null;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  product_id!: number | null;

  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant | null;

  @Column({ name: 'variant_id', type: 'bigint', nullable: true })
  variant_id!: string | null;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id!: number | null;

  // Snapshot details
  @Column({ name: 'product_name', type: 'varchar', length: 255, nullable: true })
  product_name!: string | null;

  @Column({ name: 'variant_name', type: 'varchar', length: 150, nullable: true })
  variant_name!: string | null;

  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku!: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnail_url!: string | null;

  @Column({ name: 'variant_attributes', type: 'jsonb', nullable: true })
  variant_attributes!: Record<string, unknown> | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  price!: number; // Selling price per unit

  @Column({
    name: 'unit_mrp',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unit_mrp!: number | null;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discount_amount!: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  tax_amount!: number;

  @Column({
    type: 'enum',
    enum: OrderItemStatus,
    default: OrderItemStatus.PENDING,
  })
  status!: OrderItemStatus | OrderStatus | string;

  @Column({
    name: 'delivery_otp',
    type: 'character varying',
    length: 100,
    nullable: true,
  })
  delivery_otp!: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellation_reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
