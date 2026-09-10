import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';

@Injectable()
export class GetSessionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
  ) {}

  async execute(id: string) {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: ['client', 'client.user', 'expert', 'expert.user'],
    });

    if (session && session.client) {
      if (session.client.avatar && session.client.user) {
        session.client.user.avatar = session.client.avatar;
      }
    }

    return session;
  }
}
