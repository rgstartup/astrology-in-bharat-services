import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Entity({ schema: 'astrology', name: 'kundli_reports' })
export class KundliReport {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id!: string;

  @ManyToOne(() => ProfileClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient;

  @Column({ type: 'json' })
  boy_details!: Record<string, any>;

  @Column({ type: 'json' })
  girl_details!: Record<string, any>;

  @Column({ type: 'json' })
  match_result!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
