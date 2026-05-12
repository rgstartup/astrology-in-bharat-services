import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { BankAccount } from '@/modules/expert/bank-accounts/infrastructure/entities/bank-account.entity';

export enum WithdrawalStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    SUCCESS = 'success',
    FAILED = 'failed',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
    REVERSED = 'reversed',
}

@Entity({ schema: 'finance', name: 'withdrawals' })
export class Withdrawal {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'withdrawal_no', type: 'text', nullable: true, unique: true })
    withdrawal_no!: string | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'int', name: 'user_id' })
    user_id!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @ManyToOne(() => BankAccount, { nullable: true })
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount!: BankAccount | null;

    @Column({ type: 'int', name: 'bank_account_id', nullable: true })
    bank_account_id!: number | null;

    @Column({ name: 'merchant_bank_name', type: 'text', nullable: true })
    merchant_bank_name!: string | null;

    @Column({ name: 'merchant_account_number', type: 'character varying', length: 255, nullable: true })
    merchant_account_number!: string | null;

    @Column({ name: 'merchant_ifsc', type: 'character varying', length: 255, nullable: true })
    merchant_ifsc!: string | null;

    @Column({ name: 'merchant_account_holder', type: 'text', nullable: true })
    merchant_account_holder!: string | null;

    @Column({
        type: 'enum',
        enum: WithdrawalStatus,
        default: WithdrawalStatus.PENDING,
    })
    status!: WithdrawalStatus;

    @Column({ nullable: true, type: 'text' })
    remark!: string | null;

    @Column({ name: 'transaction_reference', type: 'text', unique: true, nullable: true })
    transaction_reference!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;

    @Column({ type: 'int', name: 'admin_id', nullable: true })
    admin_id!: number | null;

    @Column({ type: 'timestamp', name: 'approval_date', nullable: true })
    approval_date!: Date | null;

    @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
    ip_address!: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    user_agent!: string | null;

    @Column({ name: 'is_high_value', type: 'bool', default: false })
    is_high_value!: boolean;
}
