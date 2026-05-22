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
  ) { }

  async execute() {
    const totalExperts = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(user.roles)", { role: RoleEnum.EXPERT })
      .getCount();

    const activeExperts = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(user.roles)", { role: RoleEnum.EXPERT })
      .leftJoin(ProfileExpert, 'profile', 'profile.user_id = user.id')
      .andWhere('profile.kyc_status = :status', { status: 'approved' })
      .getCount();

    const pendingExperts = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(user.roles)", { role: RoleEnum.EXPERT })
      .leftJoin(ProfileExpert, 'profile', 'profile.user_id = user.id')
      .andWhere('profile.kyc_status = :status', { status: 'pending' })
      .getCount();

    const blockedExperts = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(user.roles)", { role: RoleEnum.EXPERT })
      .andWhere('user.is_blocked = :isBlocked', { isBlocked: true })
      .getCount();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentExperts = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(user.roles)", { role: RoleEnum.EXPERT })
      .andWhere('user.created_at >= :today', { today })
      .getCount();

    const rejectedExperts = await this.userRepository
      .createQueryBuilder('user')
      .where(":role = ANY(user.roles)", { role: RoleEnum.EXPERT })
      .leftJoin(ProfileExpert, 'profile', 'profile.user_id = user.id')
      .andWhere('profile.kyc_status = :status', { status: 'rejected' })
      .getCount();

    return {
      totalExperts,
      activeExperts,
      pendingExperts,
      rejectedExperts,
      blockedExperts,
      recentExperts,
      trends: {
        recent: recentExperts,
      },
    };
  }
}
