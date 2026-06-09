import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';

@Injectable()
export class FindReferredUsersUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async execute(roles: string[], search?: string) {
    const qb = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.referred_by', 'agent')
      .where('user.referred_by_id IS NOT NULL');

    if (roles && roles.length > 0) {
      qb.andWhere('cast("user"."roles" as varchar[]) && ARRAY[:...roleNames]::varchar[]', { roleNames: roles });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(agent.name) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    return qb.getMany();
  }
}
