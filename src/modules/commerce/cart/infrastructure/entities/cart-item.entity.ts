import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '@/modules/commerce/product/infrastructure/entities/product.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'commerce', name: 'cart_items' })
export class CartItem {
  @PrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' }) // Eager load product details
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
