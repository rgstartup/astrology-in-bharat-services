import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { AddressTag } from '../enums/address-tag.enum';
export { AddressTag };

@Entity({ schema: 'public', name: 'addresses' })
@Unique(['profile_expert', 'tag'])
@Unique(['client_account', 'tag'])
export class Address {
  @UuidPrimaryKeyColumn()
  id!: string;

  // Map property "line1" to DB column "street"
  @Column({ name: 'street', type: 'varchar', length: 255 })
  line1!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'house_no' })
  house_no?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  // Map property "zip_code" to DB column "zip_code"
  @Column({ name: 'zip_code', type: 'varchar', length: 10, nullable: true })
  zip_code?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode?: string;

  @Column({ type: 'bool', default: false, name: 'is_primary' })
  is_primary!: boolean;

  @Column({
    type: 'enum',
    enum: AddressTag,
    default: AddressTag.HOME,
  })
  tag!: AddressTag;

  @ManyToOne(() => ProfileExpert, (profile) => profile.addresses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_expert_id' })
  profile_expert?: ProfileExpert;

  @ManyToOne(() => ClientAccount, (profile) => profile.addresses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_account_id' })
  client_account?: ClientAccount;
}
