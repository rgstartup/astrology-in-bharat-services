import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class GetAgentProfileUseCase {
  constructor(
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
  ) {}

  async execute(user: IUser) {
    const where = user.profile
      ? { id: user.profile, user_id: user.id }
      : { user_id: user.id };
    const profile = await this.profileAgentRepo.findOne({
      where,
      relations: ['user'],
    });

    if (!profile) return null;

    return {
      ...profile,
      name: profile.user?.name,
      email: profile.user?.email,
      avatar: profile.user?.avatar ?? null,
    };
  }
}
