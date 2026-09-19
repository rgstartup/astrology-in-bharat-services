// src/users/user.entity.ts
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { OAuthAccount } from '@/modules/auth/entities/oauth-accounts.entity';
import { Session } from '@/modules/auth/entities/session.entity';
import { Media } from '@/modules/media/entities/media.entity';
import { RoleEnum } from '../enums/Role.enum';
import { AdminPermission } from '../enums/AdminPermission.enum';
import { Exclude } from 'class-transformer';
import { PlatformEnum } from '../enums/Platform.enum';

@Entity({ schema: 'public', name: 'users' })
@Unique('USER_PLATFORM_UNIQ', ['email', 'platform'])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'uuid', nullable: true })
  user_group_id!: string | null;

  @Column({ type: 'character varying', length: 255 })
  email!: string;

  @Column({ type: 'text', select: false, nullable: true })
  @Exclude()
  password!: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  email_verified_at!: Date | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  first_name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  last_name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  full_name!: string | null;

  /**
   * @deprecated Use `avatar_id` and `avatar_media` relation instead.
   */
  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'int', nullable: true, name: 'avatar_id' })
  avatar_id!: number | null;

  @OneToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatar_id' })
  avatar_media!: Media | null;

  @Column({ type: 'boolean', default: false })
  is_blocked!: boolean;

  // Track kisne block kiya
  @Column({ type: 'int', nullable: true })
  blocked_by_id!: number | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  blocked_by_name!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  blocked_at!: Date | null;

  @Column({ type: 'enum', enum: RoleEnum, default: RoleEnum.CLIENT })
  role!: RoleEnum;

  @Column({
    type: 'enum',
    enum: PlatformEnum,
    default: PlatformEnum.CLIENT,
  })
  platform!: PlatformEnum;

  // Sub-admin ke liye: kaunse pages access kar sakta hai
  // Super admin ke liye: null (full access)
  @Column({
    type: 'enum',
    enum: AdminPermission,
    array: true,
    nullable: true,
    default: null,
  })
  admin_permissions!: AdminPermission[] | null;

  @OneToMany(() => OAuthAccount, (oa) => oa.user)
  oauth_accounts!: OAuthAccount[];

  @OneToMany(() => Session, (c) => c.user)
  sessions!: Session[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

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
