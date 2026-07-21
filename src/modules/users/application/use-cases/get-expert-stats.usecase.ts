import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';
import { RoleEnum } from '../../infrastructure/enums/Role.enum';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

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
        'COUNT(*) FILTER (WHERE profile.kyc_status = :approved) AS active_experts',
        'COUNT(*) FILTER (WHERE profile.kyc_status = :pending) AS pending_experts',
        'COUNT(*) FILTER (WHERE profile.kyc_status = :rejected) AS rejected_experts',
        'COUNT(*) FILTER (WHERE "user".is_blocked = true) AS blocked_experts',
        'COUNT(*) FILTER (WHERE "user".created_at >= :today) AS recent_experts',
      ])
      .where(':role = ANY("user".roles)', { role: RoleEnum.EXPERT })
      .setParameters({
        role: RoleEnum.EXPERT,
        approved: "approved",
        pending: "pending",
        rejected: "rejected",
        today
      })
      .getRawOne()

    return {
      totalExperts: Number(result.total_experts),
      activeExperts: Number(result.active_experts),
      pendingExperts: Number(result.pending_experts),
      rejectedExperts: Number(result.rejected_experts),
      blockedExperts: Number(result.blocked_experts),
      recentExperts: Number(result.recent_experts),
      trends: {
        recent: Number(result.recent_experts),
      },
    };
  }
}
