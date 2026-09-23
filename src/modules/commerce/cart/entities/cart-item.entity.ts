import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ProductVariant } from '@/modules/commerce/product/entities/variants.entity';

@Entity({ schema: 'commerce', name: 'cart_items' })
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @Column({ name: 'cart_id', type: 'int', nullable: true })
  cart_id!: number;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  product_id!: number;

  @Column({ name: 'variant_id', type: 'bigint', nullable: true })
  variant_id!: string | null;

  @ManyToOne(() => ProductVariant, { eager: true, onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
