import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Entity({ schema: 'agent', name: 'profile' })
export class AgentProfile {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total_earnings!: number;

    @Column({ type: 'int', default: 0 })
    total_registrations!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
    commission_rate!: number;

    @Column({ type: 'int', array: true, default: '{}' })
    registered_user_ids!: number[];

    @Column({ type: 'int', array: true, default: '{}' })
    registered_astrologer_ids!: number[];

    @Column({ type: 'character varying', length: 255,  nullable: true })
    bank_name!: string;

    @Column({ type: 'character varying', length: 255, nullable: true })
    account_number!: string;

    @Column({ type: 'character varying', length: 255,  nullable: true })
    ifsc_code!: string;

    @Column({ type: 'text', nullable: true })
    account_holder!: string;

    @Column({ type: 'jsonb', default: '[]' })
    bank_accounts!: any[];

    @Column({ type: 'character varying', length: 100,  nullable: true })
    phone!: string | null;

    @Column({ type: 'text', nullable: true })
    address!: string | null;

    @Column({ type: 'character varying', length: 100, nullable: true })
    city!: string | null;

    @Column({ type: 'character varying', length: 100, nullable: true })
    state!: string | null;

    @Column({ type: 'character varying', length: 100, nullable: true })
    aadhaar_no!: string;

    @Column({ type: 'character varying', length: 100, nullable: true })
    pan_no!: string;

    @Column({ type: 'character varying', length: 255, nullable: true })
    aadhaar_doc!: string;

    @Column({ type: 'character varying', length: 255, nullable: true })
    pan_doc!: string;

    @OneToOne(() => User, (user) => user.agent_profile)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({type: 'int'})
    user_id!: number;

    @CreateDateColumn({type: 'timestamptz'})
    created_at!: Date;

    @UpdateDateColumn({type: 'timestamptz'})
    updated_at!: Date;
}
