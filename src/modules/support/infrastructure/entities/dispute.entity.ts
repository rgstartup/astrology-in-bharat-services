import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

export enum DisputeStatus {
    OPEN = 'open',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    CLOSED = 'closed',
}

@Entity({ schema: 'support', name: 'support_disputes' })
export class Dispute {
    @PrimaryKeyColumn()
    id!: string;

    @ManyToOne(() => ProfileClient, { nullable: true })
    @JoinColumn({ name: 'client_id' })
    client!: ProfileClient | null;

    @Column({ name: 'client_id', type: 'uuid', nullable: true })
    client_id!: string | null;

    @ManyToOne(() => ProfileExpert, { nullable: true })
    @JoinColumn({ name: 'expert_id' })
    expert!: ProfileExpert | null;

    @Column({ name: 'expert_id', type: 'uuid', nullable: true })
    expert_id!: string | null;

    @ManyToOne('ChatSession', { nullable: true })
    @JoinColumn({ name: 'consultation_id' })
    consultation: any;

    @Column({ name: 'consultation_id', type: 'uuid', nullable: true })
    consultation_id!: string | null;

    @ManyToOne('Order', { nullable: true })
    @JoinColumn({ name: 'order_id' })
    order: any;

    @Column({ name: 'order_id', type: 'uuid', nullable: true })
    order_id!: string | null;

    @ManyToOne('PujaAppointment', { nullable: true })
    @JoinColumn({ name: 'puja_id' })
    puja: any;

    @Column({ name: 'puja_id', type: 'uuid', nullable: true })
    puja_id!: string | null;

    @Column({ type: 'varchar', length: 50, default: 'order' })
    type!: string;

    @Column({ name: 'item_id', type: 'uuid', nullable: true })
    item_id?: string;

    @Column({ type: 'varchar', length: 255 })
    category!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({
        type: 'enum',
        enum: DisputeStatus,
        default: DisputeStatus.OPEN,
    })
    status!: DisputeStatus;

    @Column({ type: 'json', nullable: true })
    item_details?: any;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;
}
