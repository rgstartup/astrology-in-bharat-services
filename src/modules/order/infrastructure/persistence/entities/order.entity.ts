import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'pending',
    PAID = 'paid',
    PACKED = 'packed',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

@Entity('product_orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    user_id: number;

    @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
    total_amount: number;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING,
    })
    status: OrderStatus;

    @Column({ name: 'razorpay_order_id', nullable: true })
    razorpay_order_id: string;

    @Column({ name: 'shipping_address', type: 'json', nullable: true })
    shipping_address: any;

    @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
    cancellation_reason?: string;

    @OneToMany(() => OrderItem, (item: OrderItem) => item.order, { cascade: true })
    items: OrderItem[];

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
