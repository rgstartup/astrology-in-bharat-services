import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';

import { QueryExpertDto } from '../../profile/api/dto/query-expert.dto';
import { ExpertKycStatus } from '../../shared/enums/kyc-status.enum';
import { ExpertAccount } from '../entities/account.entity';

@Injectable()
export class QueryExpertAccountsUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  async list(query: QueryExpertDto) {
    const offset = (query.page - 1) * query.limit;
    const qb = this.baseQuery()
      .select([
        'account.id',
        'account.name',
        'account.specialization',
        'account.experience_in_years',
        'account.is_available',
        'account.rating',
        'account.price',
        'account.chat_price',
        'account.call_price',
        'account.video_call_price',
      ])
      .skip(offset)
      .take(query.limit);

    if (query.q?.trim())
      qb.andWhere('account.name ILIKE :q', { q: `%${query.q}%` });

    if (query.specializations?.trim()) {
      qb.andWhere('account.specialization ILIKE :specialization', {
        specialization: `%${query.specializations.split(',')[0].trim()}%`,
      });
    }

    if (query.minExperience !== undefined) {
      qb.andWhere('account.experience_in_years >= :experience', {
        experience: Number(query.minExperience),
      });
    }

    if (query.online === 'true' || query.onlineOnly === 'true') {
      qb.andWhere('account.is_available = true');
    }
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        hasMore: offset + query.limit < total,
      },
    };
  }

  topRated(limit = 3) {
    return this.baseQuery()
      .select([
        'account.id',
        'account.name',
        'account.specialization',
        'account.experience_in_years',
        'account.is_available',
        'account.rating',
        'account.price',
        'account.chat_price',
        'account.call_price',
        'account.video_call_price',
      ])
      .orderBy('account.rating', 'DESC')
      .take(limit)
      .getMany();
  }

  async byId(id: string) {
    const account = await this.baseQuery()
      .andWhere('account.id = :id', { id })
      .getOne();
    if (!account) throw new NotFoundException('Expert account not found');
    return account;
  }

  byUserId(accountId: string) {
    return this.accounts.findOne({
      where: { id: accountId },
    });
  }

  private baseQuery() {
    return this.accounts
      .createQueryBuilder('account')
      .where('account.kyc_status = :kycStatus', {
        kycStatus: ExpertKycStatus.APPROVED,
      });
  }
}
