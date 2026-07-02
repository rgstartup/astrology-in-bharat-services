import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'expert', name: 'todos' })
export class Todo {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'bool', default: false })
  completed!: boolean;

  @ManyToOne(() => ProfileExpert, { onDelete: 'CASCADE' })
  expert!: ProfileExpert;

  @Column({ type: 'uuid', name: 'expert_id' })
  expert_id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
