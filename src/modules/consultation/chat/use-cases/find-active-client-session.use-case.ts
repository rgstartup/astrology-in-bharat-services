import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../entities/chat-session.entity';

@Injectable()
export class FindActiveClientSessionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async execute(clientId: string) {
    return this.sessionRepo.findOne({
      where: {
        client_id: clientId,
        status: In([ChatSessionStatus.PENDING, ChatSessionStatus.ACTIVE]),
      },
      relations: ['client', 'client.user', 'expert', 'expert.user'],
      order: { created_at: 'DESC' },
    });
  }
}
