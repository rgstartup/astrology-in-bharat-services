// src/users/user.entity.ts
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OAuthAccount } from '@/modules/auth/infrastructure/entities/oauth-accounts.entity';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { RoleEnum } from '../enums/Role.enum';
import { AdminPermission } from '../enums/AdminPermission.enum';
import { Exclude } from 'class-transformer';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'public', name: 'users' })
export class User {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'character varying', length: 255, unique: true })
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
  name!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'boolean', default: false })
  is_blocked!: boolean;

  // Track kisne block kiya
  @Column({ type: 'uuid', nullable: true })
  blocked_by_id!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  blocked_by_name!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  blocked_at!: Date | null;

  @Column({ type: 'enum', enum: RoleEnum, array: true, default: '{client}' })
  roles!: RoleEnum[];

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

  @Column({ nullable: true, type: 'uuid' })
  referred_by_id!: string | null;

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
