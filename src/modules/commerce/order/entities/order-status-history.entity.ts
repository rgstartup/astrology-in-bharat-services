import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity({ schema: 'commerce', name: 'order_status_history' })
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  order_id!: number;

  @ManyToOne(() => Order, (order) => order.status_history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'shipment_id', type: 'int', nullable: true })
  shipment_id!: number | null;

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previous_status!: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 50 })
  new_status!: string;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actor_id!: number | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 50, default: 'system' })
  actor_role!: string; // 'client' | 'merchant' | 'admin' | 'system'

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
