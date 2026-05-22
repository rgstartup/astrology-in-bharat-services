// src/auth/oauth-account.entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({
  schema: 'auth',
  name: 'oauth_accounts'
})
export class OAuthAccount {
  @PrimaryKeyColumn()
  id!: string;

  @Column({type: 'character varying', length: 255})
  provider!: string;

  @Column({type: 'character varying', length: 255})
  provider_id!: string;

  @Column({ nullable: true, type: 'text' })
  email!: string | null;

  @ManyToOne(() => User, (u) => u.oauth_accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
