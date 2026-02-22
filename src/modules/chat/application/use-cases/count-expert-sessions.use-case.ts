import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';

@Injectable()
export class CountExpertSessionsUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepo: Repository<ChatSession>,
  ) {}

  async execute(expertId: number, options: { status?: ChatSessionStatus | ChatSessionStatus[], startDate?: Date } = {}) {
    const where: any = { expertId };

    if (options.status) {
      if (Array.isArray(options.status)) {
        where.status = In(options.status);
      } else {
        where.status = options.status;
      }
    }

    if (options.startDate) {
      where.createdAt = MoreThanOrEqual(options.startDate);
    }

    return this.chatSessionRepo.count({ where });
  }
}
