import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
} from 'typeorm';

@Entity({ schema: 'commerce', name: 'products' })
export class Product {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({type: 'character varying', length: 255})
  name!: string;

  @Column({ name: 'sku', type: 'text', nullable: true, unique: true })
  sku!: string;

  @Column({ name: 'category', type: 'text', nullable: true })
  category!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'original_price',
  })
  original_price!: number;

  @Column({ type: 'text', name: 'image_url', nullable: true, default: '' })
  image_url!: string;

  @Column({ type: 'json', nullable: true })
  gallery!: string[] | null;

  @Column({ name: 'short_description', nullable: true, type: 'text' })
  short_description!: string;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  merchant_id!: string;

  @Column({ type: 'bool', default: true, name: 'is_active' })
  is_active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;

  percentage_off!: number;

  @AfterLoad()
  calculatePercentageOff() {
    const price = Number(this.price);
    const original_price = Number(this.original_price);

    if (original_price && price && original_price > price) {
      const diff = original_price - price;
      this.percentage_off = Math.round((diff / original_price) * 100);
    } else {
      this.percentage_off = 0;
    }
  }
}
