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
import { FulfillmentType } from '../enum/fulfillment-type.enum';
import { DeliveryType } from '../enum/delivery-type.enum';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';

@Entity({ schema: 'commerce', name: 'product_variant_fulfillment' })
export class ProductFulFillment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'variant_id' })
  variant_id!: number;

  @OneToOne(() => ProductVariant)
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ type: 'enum', enum: FulfillmentType, name: 'fulfillment_type' })
  fulfillment_type!: FulfillmentType;

  @Column({ type: 'enum', enum: DeliveryType, name: 'delivery_type' })
  delivery_type!: DeliveryType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'shipping_fee',
    transformer: new ColumnNumericTransformer(),
  })
  shipping_fee!: number;

  @Column({ type: 'integer', default: 0, name: 'processing_time' })
  processing_time!: number;

  @Column({ type: 'integer', default: 0, name: 'estimated_delivery_min' })
  estimated_delivery_min!: number;

  @Column({ type: 'integer', default: 0, name: 'estimated_delivery_max' })
  estimated_delivery_max!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
