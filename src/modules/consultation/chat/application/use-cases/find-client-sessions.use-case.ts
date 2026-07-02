import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class FindClientSessionsUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async execute(clientId: string) {
    return this.sessionRepo.find({
      where: { client_id: clientId },
      relations: ['client', 'client.user', 'expert', 'expert.user'],
      order: { created_at: 'DESC' },
    });
  }
}
