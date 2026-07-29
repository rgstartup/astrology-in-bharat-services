import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class ResolveSessionDetailsUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async execute(sessionIds: string[]): Promise<Record<string, { expertName: string, type: string }>> {
    if (!sessionIds || sessionIds.length === 0) return {};
    
    const sessions = await this.chatSessionRepo.find({
      where: { id: In(sessionIds) },
      relations: ['expert', 'expert.user'],
    });

    const result: Record<string, { expertName: string, type: string }> = {};
    for (const session of sessions) {
      result[session.id] = {
        expertName: session.expert?.user?.name || 'Expert',
        type: 'chat',
      };
    }
    return result;
  }
}
