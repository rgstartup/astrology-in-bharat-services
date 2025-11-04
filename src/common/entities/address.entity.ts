import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ProfileClient } from '@/client/profile/entities/profile-client.entity';
import { ProfileExpert } from '../../expert/profile/entities/profile-expert.entity';

export enum AddressTag {
  HOME = 'home',
  OFFICE = 'office',
  BILLING = 'billing',
  SHIPPING = 'shipping',
  OTHER = 'other',
}

@Entity({ name: 'addresses' })
// Composite unique: one tag per profile (client OR expert)
@Unique(['profile_client', 'tag'])
@Unique(['profile_expert', 'tag'])
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  street: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  state: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postal_code: string;

  @Column({
    type: 'enum',
    enum: AddressTag,
    default: AddressTag.OTHER,
  })
  tag: AddressTag;

  @ManyToOne(() => ProfileClient, (profile) => profile.addresses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_client_id' })
  profile_client?: ProfileClient;

  @ManyToOne(() => ProfileExpert, (profile) => profile.addresses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_expert_id' })
  profile_expert?: ProfileExpert;
}
