import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';
import { ChatGateway } from '../../chat.gateway';

@Injectable()
export class AdminTerminateSessionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async execute(
    sessionId: string,
    adminId: string,
    userMessage?: string,
    expertMessage?: string,
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (
      session.status === ChatSessionStatus.COMPLETED ||
      session.status === ChatSessionStatus.EXPIRED
    ) {
      return session;
    }

    session.status = ChatSessionStatus.COMPLETED;
    session.end_time = new Date();
    session.terminated_by = 'admin';
    await this.sessionRepo.save(session);

    // Notify via socket
    this.chatGateway.server.to(`room_${sessionId}`).emit('session_ended', {
      ...session,
      terminatedBy: 'admin',
      userMessage,
      expertMessage,
    });

    // Also notify expert dashboard
    this.chatGateway.notifyExpertStatusUpdate(
      session.expert_id,
      'session_ended',
      session,
    );

    return session;
  }
}
