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

  @Column({ nullable: true })
  mime_type!: string | null;

  @Column({ nullable: true })
  alt_text!: string | null;

  @Column({ nullable: true })
  file_size!: number | null;

  @Column({ nullable: true })
  file_name!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deleted_at!: Date | null;
}
