import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../infrastructure/persistence/entities/user.entity';

@Injectable()
export class GetExpertStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute() {
    const totalExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'expert' })
      .getCount();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentExperts = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'expert' })
      .andWhere('user.created_at >= :date', { date: sevenDaysAgo })
      .getCount();

    return {
      totalExperts,
      recentExperts, // for trends
      trends: {
         recent: recentExperts
      }
    };
  }
}
