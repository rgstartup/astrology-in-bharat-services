import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('prokerala_cache')
export class ProkeralaCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  cacheKey: string;

  @Column({ type: 'jsonb' })
  data: any;

  @CreateDateColumn()
  createdAt: Date;
}
