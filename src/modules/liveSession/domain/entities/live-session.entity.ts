import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { LiveSessionType } from '../enums/session-type.enum';
import { LiveSessionStatus } from '../enums/session-status.enum';

@Entity('live_sessions')
export class LiveSession {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    astrologerId: number;

    @Column({
        type: 'enum',
        enum: LiveSessionType,
    })
    type: LiveSessionType;

    @Column({
        type: 'enum',
        enum: LiveSessionStatus,
        default: LiveSessionStatus.ACTIVE
    })
    status: LiveSessionStatus;

    @CreateDateColumn()
    startedAt: Date;

    @Column({ nullable: true })
    endedAt: Date;
}
