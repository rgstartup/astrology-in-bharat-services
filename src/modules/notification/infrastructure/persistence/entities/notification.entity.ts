import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

export enum NotificationType {
    ORDER_CREATED = 'order_created',
    ORDER_PACKED = 'order_packed',
    ORDER_SHIPPED = 'order_shipped',
    ORDER_DELIVERED = 'order_delivered',
    ORDER_CANCELLED = 'order_cancelled',
    WALLET_RECHARGE = 'wallet_recharge',
    PUJA_BOOKING = 'puja_booking',
    GENERAL = 'general',
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    user_id: number;

    @Column({
        type: 'enum',
        enum: NotificationType,
        nullable: true,
    })
    type: NotificationType;

    @Column()
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ name: 'is_read', default: false })
    is_read: boolean;

    @Column({ type: 'json', nullable: true })
    metadata: any; // orderId, etc.

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
