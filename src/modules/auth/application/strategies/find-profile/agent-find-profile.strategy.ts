import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IFindProfileStrategy } from './find-profile.strategy';

@Injectable()
export class AgentFindProfileStrategy implements IFindProfileStrategy {
  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileRepo: Repository<ProfileAgent>,
  ) {}

  supports(role: RoleEnum): boolean {
    return role === RoleEnum.AGENT;
  }

  async findProfile(userId: string): Promise<string | null> {
    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
      select: ['id'],
    });
    return profile?.id ?? null;
  }
}
