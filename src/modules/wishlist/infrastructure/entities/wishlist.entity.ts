import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Product } from '@/modules/product/infrastructure/entities/product.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';

@Entity({ schema: 'commerce', name: 'wishlists' })
@Unique(['user', 'product'])
@Unique(['user', 'expert'])
@Unique(['user', 'puja'])
@Unique(['user', 'merchant'])


export class Wishlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true, nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: User | null;

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
