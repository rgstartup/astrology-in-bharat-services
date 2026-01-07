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

import { User } from '@/modules/users/entities/user.entity';
import { Address } from '@/common/entities/address.entity';

@Entity('profile_experts')
@Check(`"gender" IN ('male', 'female', 'other')`)
@Check(`"experience_in_years" >= 0`)
export class ProfileExpert {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile_expert)
  @JoinColumn()
  user: User;

  @Column({
    type: 'text',
  })
  gender: 'male' | 'female' | 'other';

  @Column({
    type: 'text',
  })
  specialization: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({
    type: 'int',
    default: 0,
  })
  experience_in_years: number;

  //   @Column({ type: 'decimal', nullable: true })
  //   hourlyRate?: number;
  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ default: 'pending' }) // pending, approved, rejected
  kycStatus: string;

  @Column({ type: 'int', default: 0 })
  consultationCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Address, (address) => address.profile_expert, {
    cascade: true,
    eager: true,
  })
  addresses: Address[];
}
