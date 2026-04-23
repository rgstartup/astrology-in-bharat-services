import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/persistence/entities/user.entity';

@Injectable()
export class GetUserStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalUsers = await this.userRepository.count({ where: { role: 'client' } });

    const recentUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'client' })
      .andWhere('user.created_at >= :today', { today })
      .getCount();

    const blockedUsers = await this.userRepository.count({
      where: { role: 'client', is_blocked: true },
    });

    return { totalUsers, recentUsers, blockedUsers };
  }
}
