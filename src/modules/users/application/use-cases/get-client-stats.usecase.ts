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

    const totalClients = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(\"user\".roles)", { role: RoleEnum.CLIENT })
      .getCount();

    const recentClients = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(\"user\".roles)", { role: RoleEnum.CLIENT })
      .andWhere('\"user\".created_at >= :today', { today })
      .getCount();

    const blockedClients = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(\"user\".roles)", { role: RoleEnum.CLIENT })
      .leftJoin(ProfileClient, 'profile', 'profile.user_id = \"user\".id')
      .andWhere('profile.is_blocked = :isBlocked', { isBlocked: true })
      .getCount();

    return {
      totalClients,
      recentClients,
      blockedClients,
    };
  }
}
