import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('calendar_cache')
@Index(['type', 'cacheKey'], { unique: true })
export class CalendarCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string; // 'monthly', 'daily', 'festivals'

  @Column()
  cacheKey: string; // Composite key (date-location-lang)

  @Column({ type: 'json' })
  response: any; // The full JSON payload from Prokerala

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_synced: Date;
}
