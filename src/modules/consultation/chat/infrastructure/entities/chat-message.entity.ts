import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}

@Entity({ schema: 'consultations', name: 'chat_messages' })
export class ChatMessage {
  @PrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ChatSession)
  @JoinColumn({ name: 'session_id' })
  session!: ChatSession;

  @Column({ type: 'uuid', name: 'session_id' })
  session_id!: string;

  @Column({ type: 'uuid', name: 'sender_id' })
  sender_id!: string;

  @Column({ type: 'text', name: 'sender_type' })
  sender_type!: 'user' | 'expert';

  @Column({ type: 'text' })
  content!: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type!: MessageType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
