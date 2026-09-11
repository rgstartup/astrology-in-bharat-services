import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IExpert } from '@/common/types/access-token.payload';
import { ExpertAccount } from '../entities/account.entity';
import {
  PricingStatus,
  PricingTargetAudience,
} from '../../shared/enums/pricing.enum';
import { ExpertAccountResponseDto } from '../dto/response/expert-account-response.dto';

@Injectable()
export class GetExpertAccountUseCase {
  constructor(
    @InjectRepository(ExpertAccount)
    private readonly accounts: Repository<ExpertAccount>,
  ) {}

  async execute(expert: IExpert): Promise<ExpertAccountResponseDto | null> {
    const account = await this.accounts
      .createQueryBuilder('expert')
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
      ])
      .where('expert.id = :id', { id: expert.sub })
      .addOrderBy('pricing.effective_from', 'DESC')
      .getOne();

    return ExpertAccountResponseDto.from(account);
  }
}
