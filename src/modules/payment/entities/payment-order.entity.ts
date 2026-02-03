import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

export enum PaymentStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
}

export class ColumnNumericTransformer {
    to(data: number): number {
        return data;
    }
    from(data: string): number {
        return parseFloat(data);
    }
}

@Entity('payment_orders')
export class PaymentOrder {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ unique: true })
    razorpayOrderId: string;

    @Column({ nullable: true })
    razorpayPaymentId: string;

    @Column({ nullable: true })
    razorpaySignature: string;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    amount: number;

    @Column({ default: PaymentStatus.PENDING })
    status: PaymentStatus;

    @Column({ type: 'json', nullable: true })
    notes: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
