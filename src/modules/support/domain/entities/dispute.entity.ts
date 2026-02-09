import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/modules/users/domain/entities/user.entity';

export enum DisputeType {
    ORDER = 'order',
    CONSULTATION = 'consultation',
}

export enum DisputeStatus {
    PENDING = 'pending',
    UNDER_REVIEW = 'under_review',
    RESOLVED = 'resolved',
    REJECTED = 'rejected',
}

export enum DisputePriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('disputes')
export class Dispute {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: DisputeType })
    type: DisputeType;

    @Column()
    itemId: number;

    @Column()
    category: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    itemDetails: any;

    @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING })
    status: DisputeStatus;

    @Column({ type: 'enum', enum: DisputePriority, default: DisputePriority.MEDIUM })
    priority: DisputePriority;

    @Column({ type: 'text', nullable: true })
    adminNotes: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
