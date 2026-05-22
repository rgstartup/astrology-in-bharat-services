import {
    Entity,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'agent', name: 'profile' })
export class ProfileAgent {
    @PrimaryKeyColumn()
    id!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total_earnings!: number;

    @Column({ type: 'int', default: 0 })
    total_registrations!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
    commission_rate!: number;

    @Column({ type: 'uuid', array: true, default: '{}' })
    registered_user_ids!: number[];

    @Column({ type: 'uuid', array: true, default: '{}' })
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

    @OneToOne(() => User, { cascade: true })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({type: 'uuid'})
    user_id!: string;

    @Column({ type: 'text', unique: true, nullable: true })
    uid!: string | null;

    @Column({ type: 'bool', default: false })
    is_blocked!: boolean;

    @Column({ type: 'character varying', length: 255, nullable: true })
    name!: string | null;

    @Column({ type: 'character varying', length: 255, nullable: true })
    email!: string | null;

    @Column({ type: 'text', nullable: true })
    avatar!: string | null;

    @CreateDateColumn({type: 'timestamptz'})
    created_at!: Date;

    @UpdateDateColumn({type: 'timestamptz'})
    updated_at!: Date;
}

