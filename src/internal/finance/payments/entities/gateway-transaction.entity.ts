import type { Relation } from 'typeorm';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { ClientAccount } from '../../../domains/client/account/entities/account.entity';
import { ColumnNumericTransformer } from '../../../../shared/transformers/numeric.transformer';
import { GatewayName, GatewayTransactionStatus, GatewayIntent } from '../enums';

@Entity({ schema: 'finance', name: 'gateway_transactions' })
export class GatewayTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'gateway_name',
    type: 'enum',
    enum: GatewayName,
    default: GatewayName.RAZORPAY,
  })
  gateway_name!: GatewayName;

  @Index()
  @Column({ type: 'int', name: 'client_id', nullable: true })
  client_id!: number | null;

  @ManyToOne(() => ClientAccount, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client!: Relation<ClientAccount>;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: GatewayTransactionStatus,
    default: GatewayTransactionStatus.PENDING,
  })
  status!: GatewayTransactionStatus;

  @Column({
    type: 'enum',
    enum: GatewayIntent,
  })
  intent!: GatewayIntent;

  @Index({ unique: true })
  @Column({ name: 'gateway_order_id', type: 'text', nullable: true })
  gateway_order_id!: string | null;

  @Index({ unique: true })
  @Column({ name: 'gateway_payment_id', type: 'text', nullable: true })
  gateway_payment_id!: string | null;

  @Column({ name: 'gateway_signature', type: 'text', nullable: true })
  gateway_signature!: string | null;

  @Column({ name: 'reference_id', type: 'text', nullable: true })
  reference_id!: string | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  reference_type!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failure_reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
