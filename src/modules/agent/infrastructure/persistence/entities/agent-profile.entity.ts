import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Entity('agent_profiles')
export class AgentProfile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total_earnings: number;

    @Column({ default: 0 })
    total_registrations: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
    commission_rate: number;

    @Column({ type: 'int', array: true, default: '{}' })
    registered_user_ids: number[];

    @Column({ type: 'int', array: true, default: '{}' })
    registered_astrologer_ids: number[];

    @Column({ nullable: true })
    bank_name: string;

    @Column({ nullable: true })
    account_number: string;

    @Column({ nullable: true })
    ifsc_code: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    aadhaar_no: string;

    @Column({ nullable: true })
    pan_no: string;

    @Column({ nullable: true })
    aadhaar_doc: string;

    @Column({ nullable: true })
    pan_doc: string;

    @Column({ unique: true, nullable: true, name: 'better_auth_user_id' })
    better_auth_user_id: string;

    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    user_id: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
