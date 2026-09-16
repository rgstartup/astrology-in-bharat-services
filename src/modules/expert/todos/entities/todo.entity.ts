import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpertAccount } from '@/modules/expert/account/entities/account.entity';

@Entity({ schema: 'expert', name: 'todos' })
export class Todo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'bool', default: false })
  completed!: boolean;

  @ManyToOne(() => ExpertAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
