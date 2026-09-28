import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { TerminateSessionDto } from '../dto/terminate-session.dto';

@Injectable()
export class TerminateSessionUseCase {
  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async execute(sessionId: number, adminId: number, dto: TerminateSessionDto) {
    const { userMessage, expertMessage } = dto;
    return this.chatService.adminTerminateSession(
      sessionId,
      adminId,
      userMessage,
      expertMessage,
    );
  }
}
