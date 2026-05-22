import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'content', name: 'places_cache' })
@Index(['query', 'location'], { unique: true })
export class Place {
  @PrimaryKeyColumn()
  id!: string;

  @Column({type: 'text'})
  query!: string;

  @Column({ type: 'character varying', length: 100, default: 'India' })
  location!: string;

  @Column({ type: 'json' })
  results: any; // Stores the full array of places from Serper

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  last_synced!: Date;
}

@Entity({ schema: 'content', name: 'place_images_cache' })
@Index(['query'], { unique: true })
export class PlaceImage {
  @PrimaryKeyColumn()
  id!: string;

  @Column({type: 'text'})
  query!: string;

  @Column({ type: 'json' })
  results: any; // Stores the array of image results from Serper

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  last_synced!: Date;
}
