import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';

@Entity({ schema: 'expert', name: 'bank_accounts' })
export class BankAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ExpertAccount, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount | null;

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
