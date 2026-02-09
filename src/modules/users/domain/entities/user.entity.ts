import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '@/modules/role/domain/entities/roles.entity';
import { OAuthAccount } from '@/modules/auth/domain/entities/oauth-accounts.entity';
import { Credential } from '@/modules/auth/domain/entities/credential.entity';
import { ProfileClient } from '@/modules/client/domain/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { UserCoupon } from '@/modules/coupon/domain/entities/user-coupon';

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

  @ManyToMany(() => Role, (r) => r.users)
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

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'varchar', length: 20, default: 'client' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'email&password' })
  signinBy: string;

  @OneToOne(() => ProfileClient, (p) => p.user, { cascade: true })
  profile_client?: ProfileClient;

  @OneToOne(() => ProfileExpert, (p) => p.user, { cascade: true })
  profile_expert?: ProfileExpert;

  @OneToMany('Wishlist', (w: any) => w.user)
  wishlists: any[];

  @OneToMany('Wishlist', (w: any) => w.expert)
  likedBy: any[];

  @OneToMany(() => UserCoupon, (uc) => uc.user)
  userCoupons: UserCoupon[];

  @Column({ nullable: true })
  ip_address?: string;
}
