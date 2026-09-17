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
import { Product } from './product.entity';
import { Media } from '@/modules/media/entities/media.entity';
import { MediaRole } from '../enum/media-role.enum';
import { ProductVariant } from './variants.entity';

@Entity({ schema: 'commerce', name: 'product_variant_media' })
export class ProductMedia {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id' })
  product_id!: number;

  @ManyToOne(() => Product, (product) => product.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'variant_id', nullable: true })
  variant_id!: number | null;

  @ManyToOne(() => ProductVariant, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant | null;

  @Column({ name: 'media_id' })
  media_id!: number;

  @OneToOne(() => Media)
  @JoinColumn({ name: 'media_id' })
  media!: Media;

  @Column({ type: 'enum', enum: MediaRole, nullable: true })
  media_role!: MediaRole | null;

  @Column({ name: 'is_primary', default: false })
  is_primary!: boolean;

  @Column({ name: 'is_active', default: true })
  is_active!: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sort_order!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
