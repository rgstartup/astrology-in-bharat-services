import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

@Entity({
  schema: 'auth',
  name: 'sessions',
})
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  // hashed refresh token (or session secret)
  @Column({ type: 'text' })
  secret_hash!: string;

  // distinguish between auth types (useful if you later expand)
  @Column({ default: 'refresh_token' })
  type!: 'refresh_token' | 'api_key' | 'device_session';

  @ManyToOne(() => User, (u) => u.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'bool', default: false })
  revoked!: boolean;

  @Column({ type: 'character varying', length: 100, nullable: true })
  ip_address!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  isActive(now: Date = new Date()) {
    return !this.revoked && now < this.expires_at;
  }
}
