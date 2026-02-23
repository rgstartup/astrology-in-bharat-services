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

@Entity('wishlists')
@Unique(['user', 'product'])
@Unique(['user', 'expert'])


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


  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
