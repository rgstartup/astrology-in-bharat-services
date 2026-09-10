import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'consultation', name: 'consultation_topic' })
export class ConsultationTopic {
  @UuidPrimaryKeyColumn()
  id: string;

  @Column({
    type: 'text',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'text',
  })
  slug: string;

  @Column({
    type: 'bool',
    default: true,
  })
  is_active: boolean;

  @Column({
    type: 'int',
    default: 0,
  })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
