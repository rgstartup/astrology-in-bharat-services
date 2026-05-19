import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class CountExpertSessionsUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) { }

  async execute(expertId: number, options: { status?: ChatSessionStatus | ChatSessionStatus[], startDate?: Date } = {}) {
    const where: any = { expert_id: expertId };

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

  async getRevenueAndCount(expertProfileId: number) {
    const stats = await this.chatSessionRepo
      .createQueryBuilder('chat')
      .select("SUM(chat.total_cost)", "total")
      .addSelect("COUNT(chat.id)", "count")
      .where('chat.expert_id = :id AND chat.status = :status', { id: expertProfileId, status: 'completed' })
      .getRawOne();
    return {
      total: parseFloat(stats.total) || 0,
      count: parseInt(stats.count, 10) || 0,
    };
  }
}
