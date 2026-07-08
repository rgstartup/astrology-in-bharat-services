import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { TerminateSessionDto } from '../../api/dto/terminate-session.dto';

@Injectable()
export class TerminateSessionUseCase {
  constructor(
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
  ) {}

  async execute(sessionId: string, adminId: string, dto: TerminateSessionDto) {
    const { userMessage, expertMessage } = dto;
    return this.chatFacade.adminTerminateSession(
      sessionId,
      adminId,
      userMessage,
      expertMessage,
    );
  }
}
