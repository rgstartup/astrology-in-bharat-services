import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { Product } from '@/modules/product/domain/entities/product.entity';
import { User } from '@/modules/users/domain/entities/user.entity';

@Entity('wishlists')
@Unique(['user', 'product'])
@Unique(['user', 'expert'])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.wishlists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Product, {
    onDelete: 'CASCADE',
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true, nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

