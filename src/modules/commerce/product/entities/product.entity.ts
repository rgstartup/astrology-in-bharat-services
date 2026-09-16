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

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchant_id!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
