import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductInventory } from './inventory.entity';
import { ProductFulFillment } from './fulfillment.entity';
import { ProductVariantPricing } from './pricing.entity';
import { ProductVariantPromotions } from './promotions.entity';
import { ProductMedia } from './media.entity';

@Entity({ schema: 'commerce', name: 'product_variants' })
export class ProductVariant {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  product_id!: string;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_default', default: false })
  is_default!: boolean;

  @Column({ name: 'is_active', default: true })
  is_active!: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @OneToOne(() => ProductInventory, (inventory) => inventory.variant)
  inventory!: ProductInventory;

  @OneToOne(() => ProductFulFillment, (fulfillment) => fulfillment.variant)
  fulfillment!: ProductFulFillment;

  @OneToMany(() => ProductVariantPricing, (pricing) => pricing.variant)
  pricing!: ProductVariantPricing[];

  @OneToMany(() => ProductVariantPromotions, (promotion) => promotion.variant)
  promotions!: ProductVariantPromotions[];

  @OneToMany(() => ProductMedia, (media) => media.variant)
  media!: ProductMedia[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}

