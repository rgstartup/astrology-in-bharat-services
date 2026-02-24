import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../users/infrastructure/persistence/entities/user.entity';
import { BankAccount } from '../../../../expert/bank-accounts/infrastructure/persistence/entities/bank-account.entity';

export enum WithdrawalStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    REJECTED = 'rejected',
}

@Entity('withdrawals')
export class Withdrawal {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('User')
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'int', name: 'user_id' })
    user_id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @ManyToOne('BankAccount', { nullable: true })
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount: BankAccount;

    @Column({ type: 'int', name: 'bank_account_id' })
    bank_account_id: number;

    @Column({
        type: 'enum',
        enum: WithdrawalStatus,
        default: WithdrawalStatus.PENDING,
    })
    status: WithdrawalStatus;

    @Column({ nullable: true })
    remark?: string;

    @Column({ name: 'transaction_reference', nullable: true })
    transaction_reference?: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
