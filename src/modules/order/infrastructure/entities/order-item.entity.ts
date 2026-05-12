import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '@/modules/product/infrastructure/entities/product.entity';

@Entity({ schema: 'commerce', name: 'order_items' })
export class OrderItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order!: Order;

    @Column({ name: 'order_id', type: 'int' })
    order_id!: number;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product!: Product;

    @Column({ name: 'product_id', type: 'int' })
    product_id!: number;

    @Column({ type: 'int' })
    quantity!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price!: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;
}
