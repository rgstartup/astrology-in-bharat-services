import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { ChatSession } from '@/modules/chat/entities/chat-session.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'int' })
    expertId: number;

    @ManyToOne(() => ProfileExpert)
    @JoinColumn({ name: 'expertId' })
    expert: ProfileExpert;

    @Column({ type: 'int', nullable: true })
    sessionId: number;

    @ManyToOne(() => ChatSession, { nullable: true })
    @JoinColumn({ name: 'sessionId' })
    session: ChatSession;

    @Column({ type: 'float' })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
