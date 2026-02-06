import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BankAccount } from '@/modules/expert';
import { User } from '@/modules/users/domain/entities/user.entity';

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

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'int' })
    userId: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @ManyToOne(() => BankAccount)
    @JoinColumn({ name: 'bankAccountId' })
    bankAccount: BankAccount;

    @Column({ type: 'int' })
    bankAccountId: number;

    @Column({
        type: 'enum',
        enum: WithdrawalStatus,
        default: WithdrawalStatus.PENDING,
    })
    status: WithdrawalStatus;

    @Column({ nullable: true })
    remark?: string;

    @Column({ nullable: true })
    transactionReference?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

