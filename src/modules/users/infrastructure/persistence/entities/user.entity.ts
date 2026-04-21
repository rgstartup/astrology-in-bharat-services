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
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OAuthAccount } from '@/modules/auth/infrastructure/persistence/entities/oauth-accounts.entity';
import { Session } from '@/modules/auth/infrastructure/persistence/entities/session.entity';
import { Role } from '@/modules/role/entities/roles.entity';
import { Exclude } from 'class-transformer';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { AgentProfile } from '@/modules/agent/infrastructure/persistence/entities/agent-profile.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  uid: string; // e.g. AIB-USR-A8K2XP or AIB-EXP-QR91MN

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

  @ManyToMany(() => Role, (r) => r.users)
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

  @Column({ nullable: true })
  referred_by_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'referred_by_id' })
  referred_by: User | null;

  @OneToOne(() => AgentProfile, (p) => p.user, { cascade: true })
  agent_profile?: AgentProfile;

  @OneToOne(() => ProfileMerchant, (p) => p.user, { cascade: true })
  profile_merchant?: ProfileMerchant;

  // methods

  isVerified() {
    return !!this.email_verified_at;
  }

  markEmailAsVerified() {
    this.email_verified_at = new Date();
  }
}
