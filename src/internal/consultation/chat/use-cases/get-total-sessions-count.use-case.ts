import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';

/**
 * @deprecated Legacy TypeORM total count. Replaced by Drizzle consultation queries.
 */
@Injectable()
export class GetTotalSessionsCountUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async execute() {
    return this.sessionRepo.count();
  }
}
