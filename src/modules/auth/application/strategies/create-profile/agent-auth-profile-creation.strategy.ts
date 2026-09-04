import { Injectable } from '@nestjs/common';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { QueryRunner } from 'typeorm';
import { AuthProfileCreationStrategy } from './auth-profile-creation.strategy';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class AgentAuthProfileCreationStrategy
  implements AuthProfileCreationStrategy<ProfileAgent> {
  readonly role = RoleEnum.AGENT;

  async ensureProfile(user: User, queryRunner: QueryRunner): Promise<ProfileAgent> {
    const agentProfileRepo = queryRunner.manager.getRepository(ProfileAgent);

    const existingProfile = await agentProfileRepo.findOne({ where: { user_id: user.id } });
    if (existingProfile) return existingProfile;

    const newAgentProfile = agentProfileRepo.create({
      user: user,
      name: user.name,
      commission_rate: 10,
      total_earnings: 0,
      total_registrations: 0,
    })

    return agentProfileRepo.save(newAgentProfile);
  }
}
