import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

export enum CallSessionStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
}

export enum CallType {
    AUDIO = 'audio',
    VIDEO = 'video',
}

import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';

@Entity({ schema: 'consultations', name: 'call_sessions' })
export class CallSession {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'int', name: 'user_id' })
    user_id!: number;

    @ManyToOne(() => ProfileExpert)
    @JoinColumn({ name: 'expert_id' })
    expert!: ProfileExpert;

    @Column({ type: 'int', name: 'expert_id' })
    expert_id!: number;

    @Column({ type: 'timestamptz', nullable: true, name: 'start_time' })
    start_time!: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'end_time' })
    end_time!: Date;

    @Column({
        type: 'enum',
        enum: CallSessionStatus,
        default: CallSessionStatus.PENDING,
    })
    status!: CallSessionStatus;

    @Column({
        type: 'enum',
        enum: CallType,
        default: CallType.AUDIO,
    })
    type!: CallType;

    @Column({ type: 'boolean', default: false, name: 'is_free' })
    is_free!: boolean;

    @Column({ type: 'int', default: 0, name: 'free_minutes' })
    free_minutes!: number;

    @Column({ type: 'float', name: 'price_per_minute' })
    price_per_minute!: number;

    @Column({ type: 'float', default: 0, name: 'total_cost' })
    total_cost!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'expert_earning', transformer: new ColumnNumericTransformer() })
    expert_earning!: number;

    @Column({ type: 'int', nullable: true, name: 'agent_id' })
    agent_id?: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'agent_commission', transformer: new ColumnNumericTransformer() })
    agent_commission!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'platform_fee', transformer: new ColumnNumericTransformer() })
    platform_fee!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'gst', transformer: new ColumnNumericTransformer() })
    gst!: number;

    @Column({ type: 'text', nullable: true, name: 'twilio_sid' })
    twilio_sid!: string;

    @Column({ type: 'text', nullable: true, name: 'twilio_room_id' })
    twilio_room_id!: string;

    
    @Column({ type: 'int', default: 0, name: 'duration_seconds' })
    duration_seconds!: number;

    @Column({ type: 'float', default: 0, name: 'final_price' })
    final_price!: number;
    
    @Column({ type: 'int', default: 0, name: 'max_duration_seconds' })
    max_duration_seconds!: number;
    
    @Column({ type: 'text', nullable: true, name: 'terminated_by' })
    terminated_by!: string | null;
    
    @Column({ type: 'text', nullable: true, name: 'terminated_reason' })
    terminated_reason!: string | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    created_at!: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updated_at!: Date;
}
