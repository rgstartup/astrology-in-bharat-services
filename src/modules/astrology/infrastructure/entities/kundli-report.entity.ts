import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';

@Entity({ schema: 'astrology', name: 'kundli_reports' })
export class KundliReport {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id!: string;

  @ManyToOne(() => ClientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

  @Column({ type: 'json' })
  boy_details!: Record<string, any>;

  @Column({ type: 'json' })
  girl_details!: Record<string, any>;

  @Column({ type: 'json' })
  match_result!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
