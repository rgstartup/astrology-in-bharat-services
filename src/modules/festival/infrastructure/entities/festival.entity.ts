import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'content', name: 'festivals' })
export class Festival {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: 'character varying', length: '255'})
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'timestamptz' })
  date!: Date;

  @Column({ type: 'character varying', length: 255, default: 'festival' }) // e.g., 'festival', 'holiday', 'event'
  type!: string;

  @Column({ type: 'text', nullable: true })
  image_url!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
