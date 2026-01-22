import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

export enum ChatSessionStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
}

@Entity('chat_sessions')
export class ChatSession {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'int' })
    userId: number;

    @ManyToOne(() => ProfileExpert)
    @JoinColumn({ name: 'expertId' })
    expert: ProfileExpert;

    @Column({ type: 'int' })
    expertId: number;

    @Column({ type: 'timestamptz', nullable: true })
    startTime: Date;

    @Column({ type: 'timestamptz', nullable: true })
    endTime: Date;

    @Column({
        type: 'enum',
        enum: ChatSessionStatus,
        default: ChatSessionStatus.PENDING,
    })
    status: ChatSessionStatus;

    @Column({ type: 'float' })
    pricePerMinute: number;

    @Column({ type: 'float', default: 0 })
    totalCost: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
