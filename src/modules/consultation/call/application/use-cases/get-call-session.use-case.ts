import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from '../../infrastructure/entities/call-session.entity';

@Injectable()
export class GetCallSessionUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
  ) {}

  async execute(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['client', 'client.user', 'expert', 'expert.user'],
    });

    if (!session) {
      throw new NotFoundException(
        `Call session with ID ${sessionId} not found`,
      );
    }

    return session;
  }
}
