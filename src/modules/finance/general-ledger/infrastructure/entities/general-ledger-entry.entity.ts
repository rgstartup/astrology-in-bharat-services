import { Entity, Column, CreateDateColumn } from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

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
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'text', nullable: true })
  event_id!: string | null;

  @Column({ type: 'enum', enum: GeneralLedgerEventType })
  event_type!: GeneralLedgerEventType;

  @Column({ type: 'enum', enum: GeneralLedgerEntryType })
  entry_type!: GeneralLedgerEntryType;

  @Column({ type: 'enum', enum: GeneralLedgerPartyType })
  party_type!: GeneralLedgerPartyType;

  @Column({ type: 'uuid', nullable: true })
  party_id!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
