import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Entity('support_dispute_messages')
export class DisputeMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Dispute)
    @JoinColumn({ name: 'dispute_id' })
    dispute: Dispute;

    @Column({ name: 'dispute_id' })
    dispute_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column({ name: 'sender_id' })
    sender_id: number;

    @Column({
        type: 'enum',
        enum: ['user', 'admin'],
        default: 'user'
    })
    sender_type: 'user' | 'admin';

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'boolean', default: false })
    is_read: boolean;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
