import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { BankAccount } from '@/modules/expert/bank-accounts/infrastructure/entities/bank-account.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

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
    @PrimaryKeyColumn()
    id!: string;

    @Column({ name: 'withdrawal_no', type: 'text', nullable: true, unique: true })
    withdrawal_no!: string | null;

    @ManyToOne(() => ProfileExpert, { nullable: true })
    @JoinColumn({ name: 'expert_id' })
    expert!: ProfileExpert | null;

    @Column({ type: 'uuid', name: 'expert_id', nullable: true })
    expert_id!: string | null;

    @ManyToOne(() => ProfileMerchant, { nullable: true })
    @JoinColumn({ name: 'merchant_id' })
    merchant!: ProfileMerchant | null;

    @Column({ type: 'uuid', name: 'merchant_id', nullable: true })
    merchant_id!: string | null;

    @ManyToOne(() => ProfileAgent, { nullable: true })
    @JoinColumn({ name: 'agent_id' })
    agent!: ProfileAgent | null;

    // agent_id column is already defined at line 81 as admin_id but wait, agent_id wasn't there. I'll add it here.
    @Column({ type: 'uuid', name: 'agent_profile_id', nullable: true })
    agent_profile_id!: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @ManyToOne(() => BankAccount, { nullable: true })
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount!: BankAccount | null;

    @Column({ type: 'uuid', name: 'bank_account_id', nullable: true })
    bank_account_id!: string | null;

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

    @Column({ type: 'uuid', name: 'admin_id', nullable: true })
    admin_id!: string | null;

    @Column({ type: 'timestamp', name: 'approval_date', nullable: true })
    approval_date!: Date | null;

    @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
    ip_address!: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    user_agent!: string | null;

    @Column({ name: 'is_high_value', type: 'bool', default: false })
    is_high_value!: boolean;
}
