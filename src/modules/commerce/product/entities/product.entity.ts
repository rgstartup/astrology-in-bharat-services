import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { ProductCategory } from './category.entity';
import { ProductVariant } from './variants.entity';
import { ProductType } from '../enum/product-type.enum';
import { ProductGroup } from '../enum/product-group.enum';
import { ProductMedia } from './media.entity';

@Entity({ schema: 'commerce', name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'character varying', length: 255 })
  name!: string;

  @ManyToMany(() => ProductCategory, (category) => category.products, {
    cascade: true,
  })
  @JoinTable({ name: 'product_category_relation', schema: 'commerce' })
  categories!: ProductCategory[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants!: ProductVariant[];

  @OneToMany(() => ProductMedia, (media) => media.product, {
    cascade: true,
  })
  media!: ProductMedia[];

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.GOODS,
  })
  type!: ProductType;

  @Column({
    type: 'enum',
    enum: ProductGroup,
    name: 'product_group',
    default: ProductGroup.ITEM,
  })
  product_group!: ProductGroup;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  // ---------- soon to deprecate
  @Column({ type: 'int', name: 'stock' })
  stock!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  original_price!: number;

  @Column({ type: 'boolean', default: false })
  is_shipping_chargeable: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  shipping_charge!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image_url: string | null;

  @Column({ type: 'simple-array', nullable: true })
  gallery: string[] | null;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  short_description: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  percentage_off: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string | null;
  // ---------- soon to deprecate
}
