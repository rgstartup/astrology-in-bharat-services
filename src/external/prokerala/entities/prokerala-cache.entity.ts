import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('prokerala_cache')
export class ProkeralaCacheEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  cacheKey: string;

  @Column({ type: 'jsonb' })
  data: any;

  @CreateDateColumn()
  createdAt: Date;
}
