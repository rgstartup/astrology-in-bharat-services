import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum AgentStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
}

@Entity('agents')
export class Agent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'agent_id', unique: true })
    agent_id: string; // e.g., AGT-1001

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    @Exclude()
    password: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ name: 'aadhaar_no', nullable: true })
    aadhaar_no: string;

    @Column({ name: 'pan_no', nullable: true })
    pan_no: string;

    @Column({ name: 'aadhaar_doc_url', nullable: true })
    aadhaar_doc_url: string;

    @Column({ name: 'pan_doc_url', nullable: true })
    pan_doc_url: string;

    @Column({
        type: 'enum',
        enum: AgentStatus,
        default: AgentStatus.ACTIVE,
    })
    status: AgentStatus;

    @Column({
        name: 'commission_rate',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
    })
    commission_rate: number;

    @Column({ type: 'text', nullable: true })
    avatar: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('agent_credentials')
export class AgentCredential {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    secretHash: string;

    @Column({ default: 'refresh_token' })
    type: string;

    @Column('uuid')
    agentId: string;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    @Column({ default: false })
    revoked: boolean;

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ nullable: true })
    userAgent?: string;

    @CreateDateColumn()
    createdAt: Date;
}
