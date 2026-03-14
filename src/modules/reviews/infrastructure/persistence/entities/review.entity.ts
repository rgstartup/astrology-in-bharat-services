import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ChatSession } from '@/modules/chat/infrastructure/persistence/entities/chat-session.entity';
import { CallSession } from '@/modules/call/infrastructure/persistence/entities/call-session.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', name: 'expert_id' })
  expert_id: number;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expert_id' })
  expert: ProfileExpert;

  @Column({ type: 'int', nullable: true, name: 'session_id' })
  session_id: number | null;

  @ManyToOne(() => ChatSession, { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;

  @Column({ type: 'int', nullable: true, name: 'call_session_id' })
  call_session_id: number | null;

  @ManyToOne(() => CallSession, { nullable: true })
  @JoinColumn({ name: 'call_session_id' })
  callSession: CallSession;

  @Column({ type: 'float' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
