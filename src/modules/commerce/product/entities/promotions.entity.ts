import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiscountType } from '../enum/discount-type.enum';
import { ProductVariant } from './variants.entity';
import { PricingTargetAudience } from '@/modules/expert/shared/enums/pricing.enum';

@Entity({ schema: 'commerce', name: 'product_variant_promotions' })
@Index('IDX_product_variant_promotions_lookup', [
  'variant_id',
  'target_audience',
  'is_active',
  'effective_from',
])
export class ProductVariantPromotions {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'variant_id' })
  variant_id: number;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: DiscountType })
  discount_type: DiscountType;

  @Column({ type: 'int' })
  discount_value: number;

  @Column({
    type: 'enum',
    enum: PricingTargetAudience,
    name: 'target_audience',
    default: PricingTargetAudience.ALL,
  })
  target_audience!: PricingTargetAudience;

  @Column({ type: 'timestamptz', name: 'effective_from' })
  effective_from: Date;

  @Column({ type: 'timestamptz', name: 'effective_to', nullable: true })
  effective_to: Date | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
