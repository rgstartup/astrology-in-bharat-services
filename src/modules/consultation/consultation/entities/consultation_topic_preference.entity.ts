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
import { ConsultationTopic } from './consultation_topic.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';

@Entity({ schema: 'consultations', name: 'consultation_topic_preferences' })
@Index('UQ_client_consultation_topic', ['client_id', 'topic_id'], {
  unique: true,
  where: '"client_id" IS NOT NULL',
})
@Index('UQ_expert_consultation_topic', ['expert_id', 'topic_id'], {
  unique: true,
  where: '"expert_id" IS NOT NULL',
})
export class ConsultationTopicPreference {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'client_id' })
  client_id!: string | null;

  @ManyToOne(
    () => ClientAccount,
    (client) => client.consultation_topic_preferences,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount | null;

  @Column({ type: 'uuid', nullable: true, name: 'expert_id' })
  expert_id!: string | null;

  @ManyToOne(
    () => ExpertAccount,
    (expert) => expert.consultation_topic_preferences,
    {
      onDelete: 'CASCADE',
      nullable: true,
    },
  )
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount | null;

  @Column({ type: 'uuid', name: 'topic_id' })
  topic_id!: string;

  @ManyToOne(() => ConsultationTopic, (topic) => topic.preferences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topic_id' })
  topic!: ConsultationTopic;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
