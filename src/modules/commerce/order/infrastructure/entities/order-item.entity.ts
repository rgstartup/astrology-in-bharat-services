import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'commerce', name: 'order_items' })
export class OrderItem {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id', type: 'uuid' })
  order_id!: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_id', type: 'uuid' })
  product_id!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status!: string;

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
