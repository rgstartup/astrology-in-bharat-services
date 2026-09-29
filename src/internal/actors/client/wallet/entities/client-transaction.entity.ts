import type { Relation } from 'typeorm';
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { ClientWallet } from './client-wallet.entity';
import { ColumnNumericTransformer } from '../../../../../shared/transformers/numeric.transformer';
import { ClientTransactionPurpose, ClientTransactionType } from '../enum';

@Entity({ schema: 'client', name: 'wallet_transactions' })
export class ClientTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ClientWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Relation<ClientWallet>;

  @Index()
  @Column({ name: 'wallet_id', type: 'int' })
  wallet_id!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  balance_before!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  balance_after!: number | null;

  @Column({ type: 'enum', enum: ClientTransactionType })
  type!: ClientTransactionType;

  @Column({ type: 'enum', enum: ClientTransactionPurpose })
  purpose!: ClientTransactionPurpose;

  @Column({ name: 'reference_id', type: 'text', nullable: true })
  reference_id!: string | null;

  @Column({ name: 'reference_type', type: 'text', nullable: true })
  reference_type!: string | null;

  @Column({
    name: 'transaction_no',
    type: 'text',
    nullable: true,
    unique: true,
  })
  transaction_no!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
