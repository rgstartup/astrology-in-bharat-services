import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { ProfileExpert } from '../../../../profile/infrastructure/persistence/entities/profile-expert.entity';

@Entity('expert_bank_accounts')
export class BankAccount {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', name: 'expert_id', nullable: true })
    expert_id: number;

    @ManyToOne(() => ProfileExpert, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'expert_id' })
    expert: ProfileExpert;

    @Column({ type: 'text' })
    account_holder_name: string;

    @Column({ type: 'text' })
    bank_name: string;

    @Column({ type: 'text' })
    account_number: string;

    @Column({ type: 'text' })
    ifsc_code: string;

    @Column({ type: 'text', nullable: true })
    upi_id?: string;

    @Column({ type: 'boolean', default: false })
    is_primary: boolean;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;

    @Column({ type: 'text', nullable: true, name: 'razorpay_fund_account_id' })
    razorpay_fund_account_id?: string;
}
