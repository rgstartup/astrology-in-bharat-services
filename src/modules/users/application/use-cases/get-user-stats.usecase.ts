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

    const totalUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'client' })
      .getCount();

    const recentUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'client' })
      .andWhere('user.created_at >= :today', { today })
      .getCount();

    const blockedUsers = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'client' })
      .andWhere('user.is_blocked = :isBlocked', { isBlocked: true })
      .getCount();

    return {
      totalUsers,
      recentUsers,
      blockedUsers,
    };
  }
}
