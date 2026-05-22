import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'admin', name: 'system_settings' })
export class SystemSetting {
  @PrimaryKeyColumn()
  id!: string;

  @Column({type: 'character varying', length: 255, unique: true })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
