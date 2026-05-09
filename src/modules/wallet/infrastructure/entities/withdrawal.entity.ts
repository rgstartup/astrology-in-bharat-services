import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/infrastructure/entities/user.entity';
import { BankAccount } from '../../../expert/bank-accounts/infrastructure/entities/bank-account.entity';

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

@Entity('withdrawals')
export class Withdrawal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'withdrawal_no', nullable: true, unique: true })
    withdrawal_no: string;


    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'int', name: 'user_id' })
    user_id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @ManyToOne(() => BankAccount, { nullable: true })
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount: BankAccount;

    @Column({ type: 'int', name: 'bank_account_id', nullable: true })
    bank_account_id: number;

    @Column({ name: 'merchant_bank_name', nullable: true })
    merchant_bank_name?: string;

    @Column({ name: 'merchant_account_number', nullable: true })
    merchant_account_number?: string;

    @Column({ name: 'merchant_ifsc', nullable: true })
    merchant_ifsc?: string;

    @Column({ name: 'merchant_account_holder', nullable: true })
    merchant_account_holder?: string;

    @Column({
        type: 'enum',
        enum: WithdrawalStatus,
        default: WithdrawalStatus.PENDING,
    })
    status: WithdrawalStatus;

    @Column({ nullable: true })
    remark?: string;

    @Column({ name: 'transaction_reference', unique: true, nullable: true })
    transaction_reference?: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;

    @Column({ type: 'int', name: 'admin_id', nullable: true })
    admin_id?: number;

    @Column({ type: 'timestamp', name: 'approval_date', nullable: true })
    approval_date?: Date;

    @Column({ name: 'ip_address', nullable: true })
    ip_address?: string;

    @Column({ name: 'user_agent', nullable: true })
    user_agent?: string;

    @Column({ name: 'is_high_value', default: false })
    is_high_value: boolean;
}
