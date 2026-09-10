import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CallSession } from '../entities/call-session.entity';

@Injectable()
export class ResolveSessionDetailsUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionRepo: Repository<CallSession>,
  ) {}

  async execute(
    sessionIds: string[],
  ): Promise<Record<string, { expertName: string; type: string }>> {
    if (!sessionIds || sessionIds.length === 0) return {};

    const sessions = await this.callSessionRepo.find({
      where: { id: In(sessionIds) },
      relations: ['expert', 'expert.user'],
    });

    const result: Record<string, { expertName: string; type: string }> = {};
    for (const session of sessions) {
      result[session.id] = {
        expertName: session.expert?.user?.name || 'Expert',
        type:
          (session.type as string) === 'video' ? 'video_call' : 'audio_call',
      };
    }
    return result;
  }
}
