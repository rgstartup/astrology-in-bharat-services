import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';

@Injectable()
export class GetAgentTotalCommissionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async execute(agentId: string): Promise<number> {
    const result = await this.chatSessionRepo
      .createQueryBuilder('chat')
      .select('SUM(chat.agent_commission)', 'total')
      .where('chat.agent_id = :agentId', { agentId })
      .getRawOne<{ total: string | number | null }>();

    return Number(result?.total || 0);
  }
}
