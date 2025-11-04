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
import { OAuthAccount } from '../../auth/entities/oauth-accounts.entity';
import { Credential } from '../../auth/entities/credential.entity';
import { Role } from '@/role/entities/roles.entity';
import { Exclude } from 'class-transformer';
// import { ProfileClient } from './profile-client.entity';
import { ProfileClient } from '@/client/profile/entities/profile-client.entity';
import { ProfileExpert } from '../../expert/profile/entities/profile-expert.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  @Exclude()
  password?: string; // argon2 hash

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  name?: string;

  @ManyToMany(() => Role, (r) => r.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => OAuthAccount, (oa) => oa.user)
  oauthAccounts: OAuthAccount[];

  @OneToMany(() => Credential, (c) => c.user)
  credentials: Credential[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => ProfileClient, (p) => p.user, { cascade: true })
  profile_client?: ProfileClient;

  @OneToOne(() => ProfileExpert, (p) => p.user, { cascade: true })
  profile_expert?: ProfileExpert;
}
