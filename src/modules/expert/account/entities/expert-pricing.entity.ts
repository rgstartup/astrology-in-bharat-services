import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ColumnNumericTransformer } from '@/common/transformers/numeric.transformer';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import {
  PricingStatus,
  PricingTargetAudience,
} from '../../shared/enums/pricing.enum';
import { ExpertAccount } from './account.entity';

@Entity({ schema: 'expert', name: 'expert_pricing' })
@Index('IDX_expert_pricing_lookup', [
  'expert_id',
  'target_audience',
  'is_active',
  'effective_from',
])
@Index('IDX_expert_client_pricing', ['expert_id', 'client_id', 'is_active'], {
  where: '"client_id" IS NOT NULL',
})
export class ExpertPricing {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'uuid', name: 'expert_id' })
  expert_id!: string;

  @ManyToOne(() => ExpertAccount, (expert) => expert.pricings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @Column({ type: 'uuid', nullable: true, name: 'client_id' })
  client_id!: string | null;

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

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  chat_price!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  call_price!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  video_call_price!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  report_price!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  horoscope_price!: number | null;

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

  @Column({ type: 'uuid', nullable: true, name: 'changed_by' })
  changed_by!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
