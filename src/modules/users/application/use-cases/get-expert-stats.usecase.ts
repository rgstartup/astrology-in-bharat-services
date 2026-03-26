import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/persistence/entities/user.entity';

@Injectable()
export class GetExpertStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async execute() {
    const totalExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'expert' })
      .getCount();

    const activeExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .leftJoin('user.profile_expert', 'profile')
      .where('role.name = :role', { role: 'expert' })
      .andWhere('profile.kyc_status = :status', { status: 'approved' })
      .getCount();

    const pendingExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .leftJoin('user.profile_expert', 'profile')
      .where('role.name = :role', { role: 'expert' })
      .andWhere('profile.kyc_status = :status', { status: 'pending' })
      .getCount();

    const blockedExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'expert' })
      .andWhere('user.is_blocked = :isBlocked', { isBlocked: true })
      .getCount();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'expert' })
      .andWhere('user.created_at >= :today', { today })
      .getCount();

    return {
      totalExperts,
      activeExperts,
      pendingExperts,
      blockedExperts,
      recentExperts,
      trends: {
        recent: recentExperts,
      },
    };
  }
}
