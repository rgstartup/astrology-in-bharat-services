import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RoleEnum } from '../enums/Role.enum';
import { ProfileExpert } from '../../actors/expert/profile/entities/profile-expert.entity';

@Injectable()
export class GetExpertStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin(ProfileExpert, 'profile', 'profile.user_id = "user".id')
      .select([
        'COUNT(*) AS total_experts',
        'COUNT(*) FILTER (WHERE "user".is_blocked = true) AS blocked_experts',
        'COUNT(*) FILTER (WHERE "user".created_at >= :today) AS recent_experts',
      ])
      .where(':role = ANY("user".roles)', { role: RoleEnum.EXPERT })
      .setParameters({
        role: RoleEnum.EXPERT,
        today,
      })
      .getRawOne();

    return {
      totalExperts: Number(result.total_experts),
      blockedExperts: Number(result.blocked_experts),
      recentExperts: Number(result.recent_experts),
      trends: {
        recent: Number(result.recent_experts),
      },
    };
  }
}
