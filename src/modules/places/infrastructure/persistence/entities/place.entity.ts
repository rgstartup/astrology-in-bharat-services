import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('places_cache')
@Index(['query', 'location'], { unique: true })
export class Place {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  query: string;

  @Column({ default: 'India' })
  location: string;

  @Column({ type: 'json' })
  results: any; // Stores the full array of places from Serper

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_synced: Date;
}

@Entity('place_images_cache')
@Index(['query'], { unique: true })
export class PlaceImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  query: string;

  @Column({ type: 'json' })
  results: any; // Stores the array of image results from Serper

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_synced: Date;
}
