import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersFacade } from '@/modules/users/application/users.facade';

import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';

@Injectable()
export class GetAdminAgentStatsUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepository: Repository<ProfileAgent>,
  ) {}

  async execute() {
    const { total: total_agents } = await this.usersFacade.findAllByRole(
      'agent',
      undefined,
      1,
      1,
    );
    const { total: active_agents } = await this.usersFacade.findAllByRole(
      'agent',
      undefined,
      1,
      1,
      'active',
    );

    const blocked_agents = total_agents - active_agents;

    // Calculate total listings from all agent profiles
    const listingsResult = (await this.profileAgentRepository
      .createQueryBuilder('profile')
      .select('SUM(profile.total_registrations)', 'total')
      .getRawOne()) as Record<string, unknown>;

    const total_listings = Number(listingsResult?.total) || 0;

    return {
      total_agents,
      active_agents,
      blocked_agents,
      total_listings,
      pending_payouts: 0, // Placeholder
      pending_approval: 0,
    };
  }
}
