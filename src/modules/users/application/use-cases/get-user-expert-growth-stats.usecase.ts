import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../infrastructure/persistence/entities/user.entity';

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
      .select("DATE(user.created_at)", "date")
      .addSelect("COUNT(*)", "count")
      .where('user.created_at >= :date', { date: dateLimit })
      .groupBy("DATE(user.created_at)")
      .orderBy("date", "ASC")
      .getRawMany();

    return stats.map(s => ({
      date: s.date,
      count: parseInt(s.count, 10),
    }));
  }
}
