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
import { User } from '@/modules/users';
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
    userId: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount: number;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING,
    })
    status: OrderStatus;

    @Column({ nullable: true })
    razorpayOrderId: string;

    @Column({ nullable: true, name: 'coupon_code' })
    couponCode: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'discount_amount' })
    discountAmount: number;

    @Column({ type: 'json', nullable: true })
    shippingAddress: any;

    @Column({ type: 'text', nullable: true })
    cancellationReason?: string;

    @OneToMany(() => OrderItem, (item: OrderItem) => item.order, { cascade: true })
    items: OrderItem[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

