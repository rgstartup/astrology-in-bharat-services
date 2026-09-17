import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'content', name: 'media' })
export class Media {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  url!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  alt_text!: string | null;

  @Column({ type: 'integer', nullable: true })
  file_size!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deleted_at!: Date | null;
}
