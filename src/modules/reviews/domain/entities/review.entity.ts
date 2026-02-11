import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { ChatSession } from '@/modules/chat/domain/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { User } from '@/modules/users/domain/entities/user.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  expertId: number;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expertId' })
  expert: ProfileExpert;

  @Column({ type: 'int', nullable: true })
  sessionId: number;

  @OneToOne(() => ChatSession, (session) => session.review, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session: ChatSession;

  @Column({ type: 'float' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
