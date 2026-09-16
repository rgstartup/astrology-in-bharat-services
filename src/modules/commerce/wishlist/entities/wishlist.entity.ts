import {
  Entity,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Column,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ExpertPuja } from '@/modules/expert/profile/entities/expert-puja.entity';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';

@Entity({ schema: 'commerce', name: 'wishlists' })
@Unique(['client', 'product'])
@Unique(['client', 'expert'])
@Unique(['client', 'puja'])
@Unique(['client', 'merchant'])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ClientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

  @Column({ name: 'client_id', type: 'int' })
  client_id!: number;

  @ManyToOne(() => ProfileExpert, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'expert_id', type: 'int', nullable: true })
  expert_id!: number | null;

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

  @ManyToOne(() => MerchantAccount, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: MerchantAccount | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
