import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { ClientAccount } from '@/internal/domains/client/account/entities/account.entity';
import { ColumnNumericTransformer } from '@/shared/transformers/numeric.transformer';

@Entity({ schema: 'client', name: 'wallets' })
export class ClientWallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ClientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

  @Index({ unique: true })
  @Column({ name: 'client_id', type: 'int', unique: true })
  client_id!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  balance!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'reserved_balance',
    transformer: new ColumnNumericTransformer(),
  })
  reserved_balance!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
