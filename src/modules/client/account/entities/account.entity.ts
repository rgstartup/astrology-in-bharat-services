import { User } from '@/modules/users/entities/user.entity';
import {
  BeforeInsert,
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { nanoid } from 'nanoid';
import { Address } from '@/common/address/address.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { UserStatusEnum } from '@/common/enums/user-status.enum';
import { Media } from '@/modules/media/entities/media.entity';

export type GENDER = 'male' | 'female' | 'other';

export interface ClientPreferences {
  languages?: string[];
  topics?: number[];
  specializations?: number[];
  professions?: number[];
  communication_channel?: 'chat' | 'call' | 'both';
  receive_daily_panchang?: boolean;
  [key: string]: unknown;
}

@Entity({ schema: 'client', name: 'account' })
@Check(`"gender" IN ('male', 'female', 'other')`)
export class ClientAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 12, unique: true })
  public_id!: string;

  @BeforeInsert()
  generatePublicId() {
    if (!this.public_id) {
      this.public_id = nanoid(12);
    }
  }

  @Column({ type: 'bool', default: false })
  is_blocked!: boolean;

  @Column({ type: 'character varying', length: 255, nullable: true })
  first_name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  last_name!: string | null;

  @Column({ type: 'character varying', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'character varying', length: 255 })
  email!: string;

  /**
   * @deprecated Use `avatar_id` and `avatar_media` relation instead.
   */
  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'int', nullable: true, name: 'avatar_id' })
  avatar_id!: number | null;

  @OneToOne(() => Media, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'avatar_id' })
  avatar_media!: Media | null;

  @Column({ type: 'text', nullable: true })
  username!: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  date_of_birth!: Date | null;

  @Column({
    type: 'text',
    default: 'other',
  })
  gender!: 'male' | 'female' | 'other';

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  phone_verified_at!: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  preferences!: ClientPreferences | null;

  /**
   * @deprecated Use `preferences` instead.
   */
  @Column({ type: 'text', nullable: true })
  language_preference!: string | null;

  @Column({ type: 'text', nullable: true })
  time_of_birth!: string | null;

  @Column({ type: 'text', nullable: true })
  place_of_birth!: string | null;

  @Column({ type: 'text', nullable: true })
  marital_status!: string | null;

  @Column({ type: 'text', nullable: true })
  occupation!: string | null;

  @Column({ type: 'text', nullable: true })
  about_me!: string | null;

  @OneToMany(() => Address, (address) => address.client_account, {
    cascade: true,
    eager: true,
  })
  addresses!: Address[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_spending',
    transformer: new ColumnNumericTransformer(),
  })
  total_spending!: number;

  @Column({
    type: 'enum',
    enum: UserStatusEnum,
    default: UserStatusEnum.ACTIVE,
  })
  status!: UserStatusEnum;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
