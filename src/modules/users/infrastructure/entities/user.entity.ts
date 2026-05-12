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
import { OAuthAccount } from '@/modules/auth/infrastructure/entities/oauth-accounts.entity';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { Role } from '@/modules/role/entities/roles.entity';
import { Exclude } from 'class-transformer';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { AgentProfile } from '@/modules/agent/infrastructure/entities/agent-profile.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Entity({ schema: 'public', name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true, nullable: true })
  uid!: string | null; // e.g. AIB-USR-A8K2XP or AIB-EXP-QR91MN

  @Column({ type: 'character varying', length: 255, unique: true })
  email!: string;

  @Column({ type: 'text', select: false, nullable: true })
  @Exclude()
  password!: string | null; // argon2 hash

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  email_verified_at!: Date | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @ManyToMany(() => Role, (r) => r.users)
  @JoinTable({
    schema: 'public',
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @Column({ type: 'bool', default: false })
  is_blocked!: boolean;

  @OneToMany(() => OAuthAccount, (oa) => oa.user)
  oauth_accounts!: OAuthAccount[];

  @OneToMany(() => Session, (c) => c.user)
  sessions!: Session[];

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  updated_at!: Date;

  @OneToOne(() => ProfileClient, (p) => p.user, { cascade: true })
  profile_client!: ProfileClient | null;

  @OneToOne(() => ProfileExpert, (p) => p.user, { cascade: true })
  profile_expert!: ProfileExpert | null;
  
  @OneToOne(() => AgentProfile, (p) => p.user, { cascade: true })
  agent_profile!: AgentProfile | null;

  @OneToOne(() => ProfileMerchant, (p) => p.user, { cascade: true })
  profile_merchant!: ProfileMerchant | null;

  @Column({ nullable: true, type: 'int' })
  referred_by_id!: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'referred_by_id' })
  referred_by!: User | null;

  // methods
  isVerified() {
    return !!this.email_verified_at;
  }

  markEmailAsVerified() {
    this.email_verified_at = new Date();
  }
}
