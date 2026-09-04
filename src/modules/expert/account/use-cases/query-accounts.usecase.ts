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
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const qb = this.baseQuery().skip(offset).take(limit);
    if (query.q?.trim())
      qb.andWhere('user.name ILIKE :q', { q: `%${query.q}%` });
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
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    };
  }

  topRated(limit = 3) {
    return this.baseQuery()
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
      relations: { user: true },
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
