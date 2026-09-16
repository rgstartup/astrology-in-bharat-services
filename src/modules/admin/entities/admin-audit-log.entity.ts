import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'admin', name: 'admin_audit_logs' })
export class AdminAuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'admin_id', type: 'int' })
  admin_id!: number;

  @Column({ type: 'character varying', length: 255 })
  action!: string; // e.g., 'APPROVE_WITHDRAWAL', 'REJECT_WITHDRAWAL'

  @Column({ type: 'text' })
  resource_type!: string; // e.g., 'WITHDRAWAL'

  @Column({ type: 'character varying', length: 255, nullable: true })
  resource_id!: string | null;

  @Column({ type: 'json', nullable: true })
  details!: Record<string, unknown> | null;

  @Column({
    name: 'ip_address',
    type: 'character varying',
    length: 100,
    nullable: true,
  })
  ip_address!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
