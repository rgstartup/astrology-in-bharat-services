import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Role } from '@/modules/role/entities/roles.entity';

import { AgentProfile } from '@/modules/agent/infrastructure/persistence/entities/agent-profile.entity';
import { GetSystemSettingsUseCase } from './get-system-settings.use-case';

@Injectable()
export class GetAgentsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(AgentProfile)
    private readonly agentProfileRepository: Repository<AgentProfile>,
    private readonly getSystemSettings: GetSystemSettingsUseCase,
  ) { }

  async execute(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'agent_role')
      .leftJoinAndSelect('user.agent_profile', 'agent_profile')
      .where('agent_role.name = :roleName', { roleName: 'agent' });

    if (params.search) {
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(agent_profile.phone) LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` },
      );
    }

    if (params.status) {
      // Status can be based on is_blocked or other criteria
      if (params.status === 'active') {
        qb.andWhere('user.is_blocked = :blocked', { blocked: false });
      } else if (params.status === 'blocked') {
        qb.andWhere('user.is_blocked = :blocked', { blocked: true });
      }
    }

    qb.orderBy('user.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    // Fetch commission settings
    const settings = await this.getSystemSettings.execute();
    const getSettingValue = (key: string, defaultValue: number) => {
      const setting = settings.find(s => s.key === key);
      return setting ? Number(setting.value) : defaultValue;
    };

    const clientCommPercent = getSettingValue('COMMISION_FROM_CLIENT', 3);
    const expertCommPercent = getSettingValue('COMMISION_FROM_ASTROLOGER', 3);

    const agentsData = await Promise.all(users.map(async (u) => {
      let totalAgentCommission = 0;

      // Fetch referred users and their profiles to calculate earnings
      // Replicating calculation logic from AgentStats
      const profile = u.agent_profile;
      if (profile) {
        const allRegisteredIds = [
          ...(profile.registered_user_ids || []),
          ...(profile.registered_astrologer_ids || [])
        ];

        const referredUsers = await this.userRepository.createQueryBuilder('user')
          .leftJoinAndSelect('user.profile_expert', 'pe')
          .leftJoinAndSelect('user.profile_client', 'pc')
          .where('(user.referred_by_id = :agentId OR user.id IN (:...ids))', {
            agentId: u.id,
            ids: allRegisteredIds.length > 0 ? allRegisteredIds : [0]
          })
          .getMany();

        for (const ru of referredUsers) {
          if (ru.profile_expert) {
            totalAgentCommission += (Number(ru.profile_expert.total_earning || 0) * expertCommPercent) / 100;
          }
          if (ru.profile_client) {
            totalAgentCommission += (Number(ru.profile_client.total_spending || 0) * clientCommPercent) / 100;
          }
        }
      }

      return {
        id: u.id,
        agent_id: u.uid,
        name: u.name,
        email: u.email,
        phone: u.agent_profile?.phone || null,
        avatar: u.avatar,
        status: u.is_blocked ? 'blocked' : 'active',
        createdAt: u.created_at,
        commission_rate: Number(u.agent_profile?.commission_rate) || 10.00,
        total_earned: Number(totalAgentCommission.toFixed(2)), // Use calculated value
        total_listings: Number(u.agent_profile?.total_registrations) || 0,
        pending_payout: 0,
        kyc: {
          aadhaar_no: u.agent_profile?.aadhaar_no,
          pan_no: u.agent_profile?.pan_no,
          aadhaar_doc: u.agent_profile?.aadhaar_doc,
          pan_doc: u.agent_profile?.pan_doc,
        },
        address: {
          address: u.agent_profile?.address,
          city: u.agent_profile?.city,
          state: u.agent_profile?.state,
        }
      };
    }));

    return {
      data: agentsData,
      total,
      page,
      limit,
    };
  }
}
