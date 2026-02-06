import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ProfileExpert } from './profile-expert.entity';

@Entity('expert_bank_accounts')
export class BankAccount {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    expertId: number;

    @ManyToOne(() => ProfileExpert, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'expertId' })
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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
