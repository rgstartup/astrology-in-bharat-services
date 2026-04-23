import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute() {
    const totalAgents = await this.userRepository.count({ where: { role: 'agent' } });
    const activeAgents = await this.userRepository.count({ where: { role: 'agent', is_blocked: false } });
    const blockedAgents = totalAgents - activeAgents;

    return {
      totalAgents,
      activeAgents,
      blockedAgents,
      totalListings: 0,
      pendingPayouts: 0,
      pendingApproval: 0,
    };
  }
}
