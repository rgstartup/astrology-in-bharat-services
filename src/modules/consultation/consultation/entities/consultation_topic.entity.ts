import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'consultations', name: 'consultation_topic' })
export class ConsultationTopic {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'text',
  })
  title!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'text',
  })
  slug!: string;

  @Column({
    type: 'bool',
    default: true,
  })
  is_active!: boolean;

  @Column({
    type: 'int',
    default: 0,
  })
  sort_order!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
