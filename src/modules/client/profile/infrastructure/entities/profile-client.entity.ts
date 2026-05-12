import { User } from '@/modules/users/infrastructure/entities/user.entity';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Address } from '@/common/address/address.entity';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';

@Entity({ schema: 'client', name: 'profile' })
@Check(`"gender" IN ('male', 'female', 'other')`)
export class ProfileClient {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, (user) => user.profile_client)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', nullable: true })
  user_id!: number | null;

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
  profile_picture!: string | null;

  @Column({type: 'text', nullable: true })
  marital_status!: string | null;

  @Column({ type: 'text', nullable: true })
  occupation!: string | null;

  @Column({ type: 'text', nullable: true })
  about_me!: string | null;

  @OneToMany(() => Address, (address) => address.profile_client, {
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

  @CreateDateColumn({type: 'timestamptz'})
  created_at!: Date;

  @UpdateDateColumn({type: 'timestamptz'})
  updated_at!: Date;
}
