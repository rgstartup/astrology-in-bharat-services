import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'content', name: 'calendar_cache' })
@Index(['type', 'cacheKey'], { unique: true })

export class CalendarCache {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({type: 'character varying', length: 100})
  type!: string; // 'monthly', 'daily', 'festivals'

  @Column({type: 'text'})
  cacheKey!: string; // Composite key (date-location-lang)

  @Column({ type: 'json' })
  response: any; // The full JSON payload from Prokerala

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  last_synced!: Date;
}
