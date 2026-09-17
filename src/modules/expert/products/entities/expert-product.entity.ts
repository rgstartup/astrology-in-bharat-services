import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExpertAccount } from '../../account/entities/account.entity';
import { Product } from '@/modules/commerce/product/entities/product.entity';
import { ExpertProductRelationType } from '../enum/expert-product-relation-type.enum';

@Entity({ schema: 'expert', name: 'expert_products' })
export class ExpertProducts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'expert_id' })
  expert_id: number;

  @ManyToOne(() => ExpertAccount)
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({
    name: 'relation_type',
    type: 'enum',
    enum: ExpertProductRelationType,
    default: ExpertProductRelationType.PROVIDER,
  })
  relation_type: ExpertProductRelationType;
}
