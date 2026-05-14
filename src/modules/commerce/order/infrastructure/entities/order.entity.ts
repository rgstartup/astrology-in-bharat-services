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
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'pending',
    PAID = 'paid',
    PROCESSING = 'processing',
    PACKED = 'packed',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

@Entity({ schema: 'commerce', name: 'product_orders' })
export class Order {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'int', name: 'user_id' })
    user_id!: number;

    @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
    total_amount!: number;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING,
    })
    status!: OrderStatus;

    @Column({ name: 'payment_method', default: 'razorpay', type:'character varying', length: 100 })
    payment_method!: string;

    @Column({ name: 'razorpay_order_id', type: 'text', nullable: true })
    razorpay_order_id!: string | null;

    @Column({ name: 'shipping_address', type: 'json', nullable: true })
    shipping_address: any;

    @Column({ name: 'delivery_otp', type: 'character varying', length: 100, nullable: true })
    delivery_otp!: string | null;

    @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
    cancellation_reason!: string | null;

    @Column({ name: 'coupon_code', type: 'character varying', length: 100, nullable: true })
    coupon_code!: string | null;

    @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
    discount_amount!: number;

    @OneToMany(() => OrderItem, (item: OrderItem) => item.order, { cascade: true })
    items!: OrderItem[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;
}
