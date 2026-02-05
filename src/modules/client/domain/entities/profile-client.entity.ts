import { User } from '@/modules/users';
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
import { Address } from '@/common/domain/entities/address.entity';

@Entity('profile_clients')
@Check(`"gender" IN ('male', 'female', 'other')`)
export class ProfileClient {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile_client)
  @JoinColumn()
  user: User;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


