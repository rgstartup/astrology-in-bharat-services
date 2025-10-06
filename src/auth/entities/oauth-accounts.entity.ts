// src/auth/oauth-account.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('oauth_accounts')
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  provider: string;

  @Column()
  providerId: string;

  @Column({ nullable: true })
  email?: string;

  @ManyToOne(() => User, (u) => u.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
