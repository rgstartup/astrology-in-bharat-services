import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';

@Injectable()
export class FindActiveClientSessionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async execute(clientId: string) {
    return this.sessionRepo.findOne({
      where: [
        { client_id: clientId, status: ChatSessionStatus.PENDING },
        { client_id: clientId, status: ChatSessionStatus.ACTIVE },
      ],
      relations: ['client', 'client.user', 'expert', 'expert.user'],
      order: { created_at: 'DESC' },
    });
  }
}
