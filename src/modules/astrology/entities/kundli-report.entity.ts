import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';

@Entity({ schema: 'astrology', name: 'kundli_reports' })
export class KundliReport {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'client_id', type: 'int' })
  client_id!: number;

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
