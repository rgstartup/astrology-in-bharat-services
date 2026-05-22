// src/auth/credential.entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { uuidv7 } from 'uuidv7';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({
  schema: 'auth',
  name: 'sessions'
})
export class Session {
  @PrimaryKeyColumn()
  id!: string; 

  // hashed refresh token (or session secret)
  @Column({type: 'text'})
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

  @Column({ type: 'character varying', length: 100,  nullable: true })
  ip_address!: string | null;

  @Column({ type: 'character varying', length: 100, nullable: true })
  user_agent!: string | null;

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  isActive(now: Date = new Date()) {
    return !this.revoked && now < this.expires_at;
  }

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }
}
