import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class CountExpertSessionsUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async execute(
    expert_id: string,
    options: {
      status?: ChatSessionStatus | ChatSessionStatus[];
      startDate?: Date;
    } = {},
  ) {
    const where: import('typeorm').FindOptionsWhere<ChatSession> = {
      expert_id,
    };

    if (options.status) {
      if (Array.isArray(options.status)) {
        where.status = In(options.status);
      } else {
        where.status = options.status;
      }
    }

    if (options.startDate) {
      where.created_at = MoreThanOrEqual(options.startDate);
    }

    return this.chatSessionRepo.count({ where });
  }

  async getRevenueAndCount(expertProfileId: string) {
    const stats = (await this.chatSessionRepo
      .createQueryBuilder('chat')
      .select('SUM(chat.total_cost)', 'total')
      .addSelect('COUNT(chat.id)', 'count')
      .where('chat.expert_id = :id AND chat.status = :status', {
        id: expertProfileId,
        status: 'completed',
      })
      .getRawOne<{ total: string | null; count: string | null }>()) ?? {
      total: null,
      count: null,
    };
    return {
      total: parseFloat(stats.total ?? '0') || 0,
      count: parseInt(stats.count ?? '0', 10) || 0,
    };
  }
}
