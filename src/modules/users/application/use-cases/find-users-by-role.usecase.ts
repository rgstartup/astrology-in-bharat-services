import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';

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

    if (role === 'expert') {
      if (status && status !== 'all' && status !== '') {
        query.andWhere('profile_expert.kyc_status = :status', { status });
      }

      // Use raw subqueries to avoid TypeORM subquery builder bugs
      query.addSelect('(SELECT COUNT(*) FROM consultations.chat_sessions chat WHERE chat.expert_id = profile_expert.id AND chat.status = \'completed\')', 'chat_consultations');
      query.addSelect('(SELECT COUNT(*) FROM consultations.call_sessions call WHERE call.expert_id = profile_expert.id AND call.status = \'completed\')', 'call_consultations');
    }

    const rawAndEntities = await query
      .orderBy('user.id', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getRawAndEntities();

    const items = rawAndEntities.entities.map((user, index) => {
      const raw = rawAndEntities.raw[index];
      if (user.profile_expert) {
        user.profile_expert.consultation_count = 
          parseInt(raw.chat_consultations || 0) + 
          parseInt(raw.call_consultations || 0);
      }
      return user;
    });

    const total = await query.getCount();

    return {
      items,
      total,
      page: Number(page),
      lastPage: Math.ceil(total / Number(limit)),
    };
  }
}
