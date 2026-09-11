import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryExpertDto } from '../dto/request/query-expert.dto';
import { ExpertKycStatus } from '../../shared/enums/kyc-status.enum';
import { ExpertAccount } from '../entities/account.entity';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';
import {
  PricingStatus,
  PricingTargetAudience,
} from '../../shared/enums/pricing.enum';

@Injectable()
export class QueryExpertAccountsUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  async list(query: QueryExpertDto) {
    const qb = this.baseQuery()
      .leftJoin('expert.specializations', 'expert_spec')
      .leftJoin(
        'expert_spec.specialization',
        'specialization',
        'specialization.is_active = true',
      )
      .leftJoinAndMapOne(
        'expert.pricing',
        'expert.pricings',
        'pricing',
        `pricing.is_active = true 
            AND pricing.status = :pricingStatus 
            AND pricing.target_audience = :targetAudience 
            AND pricing.effective_from <= CURRENT_TIMESTAMP 
            AND (pricing.effective_to IS NULL OR pricing.effective_to > CURRENT_TIMESTAMP)`,
        {
          pricingStatus: PricingStatus.ACTIVE,
          targetAudience: PricingTargetAudience.ALL,
        },
      )
      .select([
        'expert.id',
        'expert.about',
        'expert.languages',
        'expert.name',
        'expert.avatar',
        'expert.experience_in_years',
        'expert.rating',
        'expert_spec.id',
        'specialization.id',
        'specialization.title',
        'specialization.slug',
        'pricing.id',
        'pricing.call_price',
        'pricing.video_call_price',
        'pricing.chat_price',
        'pricing.report_price',
        'pricing.horoscope_price',
        'pricing.currency',
      ])
      .skip(query.offset)
      .take(query.limit);

    if (query?.q) qb.andWhere('expert.name ILIKE :q', { q: `%${query.q}%` });

    if (query?.specializations && query.specializations.length > 0) {
      qb.andWhere('specialization.id IN (:...specializations)', {
        specializations: query.specializations,
      });
    }

    if (query.minExperience !== undefined) {
      qb.andWhere('expert.experience_in_years >= :experience', {
        experience: Number(query.minExperience),
      });
    }

    if (query.online === 'true' || query.onlineOnly === 'true') {
      qb.andWhere('expert.is_available = true');
    }

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  topRated(limit = 3) {
    return this.baseQuery()
      .leftJoin('expert.specializations', 'expert_spec')
      .leftJoin(
        'expert_spec.specialization',
        'specialization',
        'specialization.is_active = true',
      )
      .leftJoinAndMapOne(
        'expert.pricing',
        'expert.pricings',
        'pricing',
        `pricing.is_active = true 
            AND pricing.status = :pricingStatus 
            AND pricing.target_audience = :targetAudience 
            AND pricing.effective_from <= CURRENT_TIMESTAMP 
            AND (pricing.effective_to IS NULL OR pricing.effective_to > CURRENT_TIMESTAMP)`,
        {
          pricingStatus: PricingStatus.ACTIVE,
          targetAudience: PricingTargetAudience.ALL,
        },
      )
      .select([
        'expert.id',
        'expert.about',
        'expert.languages',
        'expert.name',
        'expert.avatar',
        'expert.experience_in_years',
        'expert.rating',
        'expert_spec.id',
        'specialization.id',
        'specialization.title',
        'specialization.slug',
        'pricing.id',
        'pricing.call_price',
        'pricing.video_call_price',
        'pricing.chat_price',
        'pricing.report_price',
        'pricing.horoscope_price',
        'pricing.currency',
      ])
      .orderBy('expert.rating', 'DESC')
      .take(limit)
      .getMany();
  }

  async byId(id: string) {
    const account = await this.baseQuery()
      .leftJoin('expert.specializations', 'expert_spec')
      .leftJoin(
        'expert_spec.specialization',
        'specialization',
        'specialization.is_active = true',
      )
      .leftJoinAndMapOne(
        'expert.pricing',
        'expert.pricings',
        'pricing',
        `pricing.is_active = true 
            AND pricing.status = :pricingStatus 
            AND pricing.target_audience = :targetAudience 
            AND pricing.effective_from <= CURRENT_TIMESTAMP 
            AND (pricing.effective_to IS NULL OR pricing.effective_to > CURRENT_TIMESTAMP)`,
        {
          pricingStatus: PricingStatus.ACTIVE,
          targetAudience: PricingTargetAudience.ALL,
        },
      )
      .select([
        'expert.id',
        'expert.about',
        'expert.languages',
        'expert.name',
        'expert.avatar',
        'expert.experience_in_years',
        'expert.rating',
        'expert.total_reviews',
        'expert.total_likes',
        'expert.is_available',
        'expert_spec.id',
        'specialization.id',
        'specialization.title',
        'specialization.slug',
        'pricing.id',
        'pricing.call_price',
        'pricing.video_call_price',
        'pricing.chat_price',
        'pricing.report_price',
        'pricing.horoscope_price',
        'pricing.currency',
      ])
      .andWhere('expert.id = :id', { id })
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
      .createQueryBuilder('expert')
      .where('expert.kyc_status = :kycStatus', {
        kycStatus: ExpertKycStatus.APPROVED,
      });
  }
}
