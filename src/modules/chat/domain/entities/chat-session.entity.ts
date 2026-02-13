import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { User } from '@/modules/users/domain/entities/user.entity';
import { Review } from '@/modules/reviews/domain/entities/review.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';

export enum ChatSessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum SessionType {
  CHAT = 'chat',
  VOICE = 'audio',
  VIDEO = 'video',
}
// fsdlkjf

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expertId' })
  expert: ProfileExpert;

  @Column({ type: 'int' })
  expertId: number;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ChatSessionStatus,
    default: ChatSessionStatus.PENDING,
  })
  status: ChatSessionStatus;

  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.CHAT,
  })
  sessionType: SessionType;

  @Column({ type: 'boolean', default: false })
  isFree: boolean;

  @Column({ type: 'int', default: 0 })
  freeMinutes: number;

  @Column({ type: 'float' })
  pricePerMinute: number;

  @Column({ type: 'float', default: 0 })
  totalCost: number;

  @Column({ type: 'text', nullable: true })
  terminatedBy: string;

  @Column({ type: 'int', default: 0 })
  duration: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ChatMessage, (message) => message.session)
  messages: ChatMessage[];

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Review, (review) => review.session)
  review: Review;
}

