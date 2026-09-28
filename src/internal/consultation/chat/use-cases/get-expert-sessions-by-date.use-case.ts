import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatSessionStatus } from '../enum';

@Injectable()
export class GetExpertSessionsByDateUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
  ) {}

  async execute(expert_id: number, startDate: Date, endDate: Date) {
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
