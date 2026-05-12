import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'content', name: 'places_cache' })
@Index(['query', 'location'], { unique: true })
export class Place {
  @PrimaryGeneratedColumn()
  id!: number;

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
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: 'text'})
  query!: string;

  @Column({ type: 'json' })
  results: any; // Stores the array of image results from Serper

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  last_synced!: Date;
}
