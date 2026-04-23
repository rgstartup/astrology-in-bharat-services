import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from '@/common/address/address.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Entity('profile_clients')
@Check(`"gender" IN ('male', 'female', 'other')`)
export class ProfileClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  better_auth_user_id: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'user_id' })
  user_id: number;

  @Column({ nullable: true })
  username?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  date_of_birth: Date | null;

  @Column({
    type: 'text',
    default: 'other',
  })
  gender: 'male' | 'female' | 'other';

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  phone_verified_at?: Date | null;

  @Column({ nullable: true })
  preferences?: string;

  @Column({ nullable: true })
  language_preference?: string;

  @Column({ nullable: true })
  time_of_birth?: string;

  @Column({ nullable: true })
  place_of_birth?: string;

  @Column({ nullable: true })
  profile_picture?: string;

  @Column({ nullable: true })
  marital_status?: string;

  @Column({ nullable: true })
  occupation?: string;

  @Column({ type: 'text', nullable: true })
  about_me?: string;

  @OneToMany(() => Address, (address) => address.profile_client, {
    cascade: true,
    eager: true,
  })
  addresses: Address[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_spending',
    transformer: new ColumnNumericTransformer(),
  })
  total_spending: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}