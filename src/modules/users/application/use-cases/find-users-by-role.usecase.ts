import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/persistence/entities/user.entity';

@Injectable()
export class FindUsersByRoleUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async execute(role: string, search?: string, page: number = 1, limit: number = 10, status?: string) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.profile_client', 'profile_client')
      .leftJoinAndSelect('user.profile_expert', 'profile_expert')
      .where('role.name = :role', { role });

    if (search) {
      query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (status && role === 'expert') {
      query.andWhere('profile_expert.kyc_status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('user.id', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getManyAndCount();

    return {
      items,
      total,
      page: Number(page),
      lastPage: Math.ceil(total / Number(limit)),
    };
  }
}
