import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from './variants.entity';

@Entity({ schema: 'commerce', name: 'product_variant_inventory' })
export class ProductInventory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'variant_id' })
  variant_id!: number;

  @OneToOne(() => ProductVariant)
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ name: 'stock', default: 0 })
  stock!: number;

  @Column({ name: 'reserved_stock', default: 0 })
  reserved_stock!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  get available_stock() {
    return Math.max(0, this.stock - this.reserved_stock);
  }
}
