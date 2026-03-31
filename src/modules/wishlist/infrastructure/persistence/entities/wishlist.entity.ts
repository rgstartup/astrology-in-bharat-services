import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Product } from '@/modules/product/infrastructure/persistence/entities/product.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/persistence/entities/expert-puja.entity';


@Entity('wishlists')
@Unique(['user', 'product'])
@Unique(['user', 'expert'])
@Unique(['user', 'puja'])


export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true, nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ExpertPuja, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'puja_id' })
  puja: ExpertPuja;


  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
