import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';

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
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'client' })
      .getCount();

    const recentClients = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'client' })
      .andWhere('user.created_at >= :today', { today })
      .getCount();

    const blockedClients = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :role', { role: 'client' })
      .andWhere('user.is_blocked = :isBlocked', { isBlocked: true })
      .getCount();

    return {
      totalClients,
      recentClients,
      blockedClients,
    };
  }
}
