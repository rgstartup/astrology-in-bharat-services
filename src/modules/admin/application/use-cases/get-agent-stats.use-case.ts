import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Role } from '@/modules/role/entities/roles.entity';

import { AgentProfile } from '@/modules/agent/infrastructure/persistence/entities/agent-profile.entity';

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(AgentProfile)
    private readonly agentProfileRepository: Repository<AgentProfile>,
  ) { }

  async execute() {
    const agentRole = await this.roleRepository.findOne({ where: { name: 'agent' } });
    if (!agentRole) return { totalAgents: 0, activeAgents: 0, blockedAgents: 0 };

    const totalAgents = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.id = :roleId', { roleId: agentRole.id })
      .getCount();

    const activeAgents = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.id = :roleId', { roleId: agentRole.id })
      .where('user.is_blocked = :blocked', { blocked: false })
      .getCount();

    const blockedAgents = totalAgents - activeAgents;

    // Calculate total listings from all agent profiles
    const listingsResult = await this.agentProfileRepository
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
