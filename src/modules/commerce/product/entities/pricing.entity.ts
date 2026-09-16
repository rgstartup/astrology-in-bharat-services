import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import {
  PricingStatus,
  PricingTargetAudience,
} from '@/modules/expert/shared/enums/pricing.enum';
import { ProductVariant } from './variants.entity';

@Entity({ schema: 'commerce', name: 'product_variant_pricing' })
export class ProductVariantPricing {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'variant_id' })
  variant_id!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount!: number;

  @ManyToOne(() => ProductVariant, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ type: 'int', nullable: true, name: 'client_id' })
  client_id!: number | null;

  @ManyToOne(() => ClientAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount | null;

  @Column({
    type: 'enum',
    enum: PricingTargetAudience,
    default: PricingTargetAudience.ALL,
    name: 'target_audience',
  })
  target_audience!: PricingTargetAudience;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({
    type: 'enum',
    enum: PricingStatus,
    default: PricingStatus.ACTIVE,
  })
  status!: PricingStatus;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  effective_from!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  effective_to!: Date | null;

  @Column({ type: 'text', nullable: true })
  change_reason!: string | null;

  @Column({ type: 'int', nullable: true, name: 'changed_by' })
  changed_by!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
