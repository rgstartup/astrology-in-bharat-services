import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProfileAgent)
    private readonly ProfileAgentRepository: Repository<ProfileAgent>,
  ) { }

  async execute() {
    const totalAgents = await this.userRepository
      .createQueryBuilder('user')
      .where(':roleName = ANY(user.roles)', { roleName: 'agent' })
      .getCount();

    const activeAgents = await this.userRepository
      .createQueryBuilder('user')
      .where(':roleName = ANY(user.roles)', { roleName: 'agent' })
      .andWhere('user.is_blocked = :blocked', { blocked: false })
      .getCount();

    const blockedAgents = totalAgents - activeAgents;

    // Calculate total listings from all agent profiles
    const listingsResult = await this.ProfileAgentRepository
      .createQueryBuilder('profile')
      .select('SUM(profile.total_registrations)', 'total')
      .getRawOne();

    const totalListings = Number(listingsResult?.total) || 0;

    return {
      totalAgents,
      activeAgents,
      blockedAgents,
      totalListings,
      pendingPayouts: 0, // Placeholder
      pendingApproval: 0,
    };
  }
}


