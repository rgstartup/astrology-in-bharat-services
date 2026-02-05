// src/auth/credential.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn()
  id: number;

  // hashed refresh token (or session secret)
  @Column()
  secretHash: string;

  // distinguish between auth types (useful if you later expand)
  @Column({ default: 'refresh_token' })
  type: 'refresh_token' | 'api_key' | 'device_session';

  @ManyToOne(() => User, (u) => u.credentials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}

