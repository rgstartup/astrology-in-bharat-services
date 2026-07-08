import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { GetLiveSessionsDto } from '../../api/dto/get-live-sessions.dto';

@Injectable()
export class GetLiveSessionsUseCase {
  constructor(
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
  ) {}

  async execute(dto: GetLiveSessionsDto) {
    const { type, page, limit } = dto;
    return this.chatFacade.findAllSessions(type, page, limit);
  }
}
