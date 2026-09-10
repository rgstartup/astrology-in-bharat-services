import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { ConsultationTopicPreference } from './consultation_topic_preference.entity';

@Entity({ schema: 'consultations', name: 'consultation_topic' })
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

  @OneToMany(
    () => ConsultationTopicPreference,
    (preference) => preference.topic,
  )
  preferences!: ConsultationTopicPreference[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
