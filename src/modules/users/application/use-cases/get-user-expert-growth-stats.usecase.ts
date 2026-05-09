import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';

@Injectable()
export class GetUserExpertGrowthStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(days: number = 7) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const stats = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .select("DATE(user.created_at)", "date")
      .addSelect("COUNT(DISTINCT CASE WHEN role.name = 'client' THEN user.id END)", "userCount")
      .addSelect("COUNT(DISTINCT CASE WHEN role.name = 'expert' THEN user.id END)", "expertCount")
      .where('user.created_at >= :date', { date: dateLimit })
      .groupBy("DATE(user.created_at)")
      .orderBy("date", "ASC")
      .getRawMany();

    return stats.map(s => ({
      date: s.date,
      users: parseInt(s.userCount, 10) || 0,
      experts: parseInt(s.expertCount, 10) || 0,
    }));
  }
}
