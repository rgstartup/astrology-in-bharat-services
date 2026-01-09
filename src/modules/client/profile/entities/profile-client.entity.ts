import { User } from '@/modules/users/entities/user.entity';
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
import { Address } from '@/common/entities/address.entity';

@Entity('profile_clients')
@Check(`"gender" IN ('male', 'female', 'other')`)
export class ProfileClient {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile_client)
  @JoinColumn()
  user: User;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  date_of_birth: Date | null;

  @Column({
    type: 'text',
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
