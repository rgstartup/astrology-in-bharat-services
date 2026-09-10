import { User } from '@/modules/users/infrastructure/entities/user.entity';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from '@/common/address/address.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { UserStatusEnum } from '@/common/enums/user-status.enum';
import { ConsultationTopicPreference } from '@/modules/consultation/consultation/entities/consultation_topic_preference.entity';

export type GENDER = 'male' | 'female' | 'other';

@Entity({ schema: 'client', name: 'account' })
@Check(`"gender" IN ('male', 'female', 'other')`)
export class ClientAccount {
  @UuidPrimaryKeyColumn()
  id!: string;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', unique: true, nullable: true })
  uid!: string | null;

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

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

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

  @Column({ type: 'text', nullable: true })
  preferences!: string | null;

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

  @OneToMany(
    () => ConsultationTopicPreference,
    (preference) => preference.client,
  )
  consultation_topic_preferences!: ConsultationTopicPreference[];

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
