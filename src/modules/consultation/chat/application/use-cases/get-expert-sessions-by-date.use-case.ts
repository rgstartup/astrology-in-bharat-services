import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class GetExpertSessionsByDateUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
  ) {}

  async execute(expert_id: string, startDate: Date, endDate: Date) {
    return this.sessionRepo.find({
      where: {
        expert_id: expert_id,
        status: ChatSessionStatus.COMPLETED,
        created_at: Between(startDate, endDate),
      },
      relations: ['client', 'client.user', 'expert'],
    });
  }
}
