import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';

@Injectable()
export class GetClientStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

 const result = await this.userRepository
  .createQueryBuilder('user')
  .leftJoin(ProfileClient, 'profile', 'profile.user_id = user.id')
  .select([
    `COUNT(*) AS total_clients`,
    `COUNT(*) FILTER (WHERE user.created_at >= :today) AS recent_clients`,
    `COUNT(*) FILTER (WHERE profile.is_blocked = true) AS blocked_clients`,
  ])
  .where(':role = ANY(user.roles)', { role: RoleEnum.CLIENT })
  .setParameter('today', today)
  .getRawOne();

return {
  totalUsers: Number(result.total_clients),
  recentUsers: Number(result.recent_clients),
  blockedUsers: Number(result.blocked_clients),
};

}
}
