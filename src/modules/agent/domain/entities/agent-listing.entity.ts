import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

export enum ListingType {
    ASTROLOGER = 'astrologer',
    MANDIR = 'mandir',
    PUJA_SHOP = 'puja_shop',
}

export enum ListingStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('agent_listings')
export class AgentListing {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: ListingType })
    type: ListingType;

    @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.PENDING })
    status: ListingStatus;

    @Column()
    name: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    phone: string;

    // Mandir specific
    @Column({ nullable: true })
    deity: string;

    // Astrologer specific
    @Column({ nullable: true })
    specialization: string;

    // Puja Shop specific
    @Column({ type: 'text', nullable: true })
    items: string;

    // Common extra info
    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    image_url: string;

    // Agent who created this listing
    @Column({ nullable: true })
    agentId: string;

    @ManyToOne(() => Agent, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
