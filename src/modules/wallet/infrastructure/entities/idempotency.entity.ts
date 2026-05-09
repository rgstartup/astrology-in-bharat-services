import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../../users/infrastructure/entities/user.entity';

@Entity('idempotency_keys')
@Index(['key', 'user_id'], { unique: true })
export class Idempotency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: number;

  @Column({ name: 'payload_hash', nullable: true })
  payload_hash: string;

  @Column({ type: 'jsonb', nullable: true })
  response_payload: any;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
