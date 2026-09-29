import type { DeferredDependency } from '@/shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { GetLiveSessionsDto } from '../dto/get-live-sessions.dto';

@Injectable()
export class GetLiveSessionsUseCase {
  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: DeferredDependency<ChatService>,
  ) {}

  async execute(dto: GetLiveSessionsDto) {
    const { type, page, limit } = dto;
    return this.chatService.findAllSessions(type, page, limit);
  }
}
