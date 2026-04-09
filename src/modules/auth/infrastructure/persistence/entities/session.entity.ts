// src/auth/credential.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { uuidv7 } from 'uuidv7';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string; 

  // hashed refresh token (or session secret)
  @Column()
  secret_hash: string;

  // distinguish between auth types (useful if you later expand)
  @Column({ default: 'refresh_token' })
  type: 'refresh_token' | 'api_key' | 'device_session';

  @ManyToOne(() => User, (u) => u.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ nullable: true })
  ip_address?: string;

  @Column({ nullable: true })
  user_agent?: string;

  @CreateDateColumn()
  created_at: Date;

  isActive(now: Date = new Date()) {
    return !this.revoked && now < this.expires_at;
  }

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }
}
