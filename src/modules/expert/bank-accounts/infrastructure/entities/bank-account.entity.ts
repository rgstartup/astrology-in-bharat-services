import {
    Entity,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'expert', name: 'bank_accounts' })
export class BankAccount {
    @PrimaryKeyColumn()
    id!: string;

    @Column({ type: 'uuid', name: 'expert_id', nullable: true })
    expert_id!: string | null;

    @ManyToOne(() => ProfileExpert, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'expert_id' })
    expert!: ProfileExpert | null;

    @Column({ type: 'text' })
    account_holder_name!: string;

    @Column({ type: 'text' })
    bank_name!: string;

    @Column({ type: 'text' })
    account_number!: string;

    @Column({ type: 'text' })
    ifsc_code!: string;

    @Column({ type: 'text', nullable: true })
    upi_id!: string | null;

    @Column({ type: 'boolean', default: false })
    is_primary!: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;

    @Column({ type: 'text', nullable: true, name: 'razorpay_fund_account_id' })
    razorpay_fund_account_id!: string | null; 
}
