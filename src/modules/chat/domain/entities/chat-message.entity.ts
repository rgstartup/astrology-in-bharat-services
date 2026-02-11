import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChatSession, (session) => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session: ChatSession;

  @Column({ type: 'int' })
  sessionId: number;

  @Column({ type: 'int' })
  senderId: number;

  @Column({ type: 'text' })
  senderType: 'user' | 'expert' | 'admin';

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  attachmentUrl?: string;

  @Column({ type: 'text', nullable: true })
  attachmentType?: string;

  @CreateDateColumn()
  createdAt: Date;
}
