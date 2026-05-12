import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../users/infrastructure/entities/user.entity';

@Entity({ schema: 'finance', name: 'idempotency_keys' })
@Index(['key', 'user_id'], { unique: true })
export class Idempotency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: 'text'})
  key!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'int' })
  user_id!: number;

  @Column({ name: 'payload_hash', type: 'text', nullable: true })
  payload_hash!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  response_payload: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
