import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export enum GeneralLedgerEntryType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum GeneralLedgerPartyType {
  CLIENT = 'client',
  EXPERT = 'expert',
  MERCHANT = 'merchant',
  AGENT = 'agent',
  PLATFORM = 'platform',
}

export enum GeneralLedgerEventType {
  RECHARGE = 'recharge',
  CONSULTATION = 'consultation',
  PUJA = 'puja',
  PRODUCT_ORDER = 'product_order',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  AGENT_COMMISSION = 'agent_commission',
  PLATFORM_FEE = 'platform_fee',
}

@Entity({ schema: 'finance', name: 'general_ledger' })
export class GeneralLedgerEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', nullable: true })
  event_id!: string | null;

  @Column({ type: 'enum', enum: GeneralLedgerEventType })
  event_type!: GeneralLedgerEventType;

  @Column({ type: 'enum', enum: GeneralLedgerEntryType })
  entry_type!: GeneralLedgerEntryType;

  @Column({ type: 'enum', enum: GeneralLedgerPartyType })
  party_type!: GeneralLedgerPartyType;

  @Column({ type: 'int', nullable: true })
  party_id!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
