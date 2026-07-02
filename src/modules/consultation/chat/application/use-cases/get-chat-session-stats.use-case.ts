import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class GetChatSessionStatsUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async execute() {
    const result: unknown = await this.sessionRepo
      .createQueryBuilder('session')
      .select('COUNT(*) as total')
      .addSelect("COUNT(*) FILTER (WHERE status = 'active') as live")
      .addSelect(
        "COUNT(*) FILTER (WHERE status IN ('expired', 'completed')) as expired",
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE status = 'completed' AND terminated_by = 'admin') as admin_terminated",
      )
      .getRawOne();

    const stats = result as Record<string, string>;

    return {
      total: parseInt(stats.total, 10) || 0,
      live: parseInt(stats.live, 10) || 0,
      expired: parseInt(stats.expired, 10) || 0,
      adminTerminated: parseInt(stats.admin_terminated, 10) || 0,
    };
  }
}
