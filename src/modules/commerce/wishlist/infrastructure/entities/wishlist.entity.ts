import {
  Entity,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Column,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'commerce', name: 'wishlists' })
@Unique(['client', 'product'])
@Unique(['client', 'expert'])
@Unique(['client', 'puja'])
@Unique(['client', 'merchant'])
export class Wishlist {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ProfileClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient;

  @Column({ name: 'client_id', type: 'uuid' })
  client_id!: string;

  @ManyToOne(() => ProfileExpert, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expert_id!: string | null;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product | null;

  @ManyToOne(() => ExpertPuja, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'puja_id' })
  puja!: ExpertPuja;

  @ManyToOne(() => ProfileMerchant, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: ProfileMerchant | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
