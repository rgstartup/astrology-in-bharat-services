import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LiveSession } from './live-session.entity';

@Entity('live_session_messages')
export class LiveSessionMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sessionId: number;

    @Column()
    senderId: number;

    @Column('text')
    message: string;

    @CreateDateColumn()
    timestamp: Date;

    @ManyToOne(() => LiveSession)
    @JoinColumn({ name: 'sessionId' })
    session: LiveSession;
}
