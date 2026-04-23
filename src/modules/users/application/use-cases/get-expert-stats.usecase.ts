import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/persistence/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class GetExpertStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalExperts = await this.userRepository.count({ where: { role: 'expert' } });

    const activeExperts = await this.profileRepo.count({
      where: { kyc_status: 'approved' },
    });

    const pendingExperts = await this.profileRepo.count({
      where: { kyc_status: 'pending' },
    });

    const blockedExperts = await this.userRepository.count({
      where: { role: 'expert', is_blocked: true },
    });

    const recentExperts = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'expert' })
      .andWhere('user.created_at >= :today', { today })
      .getCount();

    return {
      totalExperts,
      activeExperts,
      pendingExperts,
      blockedExperts,
      recentExperts,
      trends: { recent: recentExperts },
    };
  }
}
