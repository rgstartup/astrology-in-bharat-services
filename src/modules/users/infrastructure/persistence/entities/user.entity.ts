// src/users/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { OAuthAccount } from '@/modules/auth/infrastructure/persistence/entities/oauth-accounts.entity';
import { Session } from '@/modules/auth/infrastructure/persistence/entities/session.entity';
import { Role } from '@/modules/role/entities/roles.entity';
import { Exclude } from 'class-transformer';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  @Exclude()
  password?: string; // argon2 hash

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  email_verified_at: Date | null;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @ManyToMany(() => Role, (r) => r.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ default: false })
  is_blocked: boolean;

  @OneToMany(() => OAuthAccount, (oa) => oa.user)
  oauth_accounts: OAuthAccount[];

  @OneToMany(() => Session, (c) => c.user)
  sessions: Session[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => ProfileClient, (p) => p.user, { cascade: true })
  profile_client?: ProfileClient;

  @OneToOne(() => ProfileExpert, (p) => p.user, { cascade: true })
  profile_expert?: ProfileExpert;

  // methods

  isVerified() {
    return !!this.email_verified_at;
  }

  markEmailAsVerified() {
    this.email_verified_at = new Date();
  }
}
