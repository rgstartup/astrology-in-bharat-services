import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ProfileClient } from '@/modules/client';
import { ProfileExpert } from '@/modules/expert';

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

  // Map property "line1" to DB column "street"
  @Column({ name: 'street', type: 'varchar', length: 255 })
  line1: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  houseNo?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  // Map property "zipCode" to DB column "postal_code"
  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  zipCode: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode?: string;

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
