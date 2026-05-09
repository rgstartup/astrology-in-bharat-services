import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

export enum DisputeStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    CLOSED = 'closed',
}

@Entity('support_disputes')
export class Dispute {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    user_id: number;

    @ManyToOne('ChatSession', { nullable: true })
    @JoinColumn({ name: 'consultation_id' })
    consultation: any;

    @Column({ name: 'consultation_id', nullable: true })
    consultation_id?: number;

    @ManyToOne('Order', { nullable: true })
    @JoinColumn({ name: 'order_id' })
    order: any;

    @Column({ name: 'order_id', nullable: true })
    order_id?: number;

    @ManyToOne('PujaAppointment', { nullable: true })
    @JoinColumn({ name: 'puja_id' })
    puja: any;

    @Column({ name: 'puja_id', nullable: true })
    puja_id?: number;

    @Column({ type: 'varchar', length: 50, default: 'order' })
    type: string;

    @Column({ name: 'item_id', nullable: true })
    item_id?: number;

    @Column({ type: 'varchar', length: 255 })
    category: string;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: DisputeStatus,
        default: DisputeStatus.OPEN,
    })
    status: DisputeStatus;

    @Column({ type: 'json', nullable: true })
    item_details?: any;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
