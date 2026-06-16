import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CommissionRule,
  CommissionAppliesRole,
  CommissionRateType,
} from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';
import { CommissionTier } from '@/modules/finance/commissions/infrastructure/entities/commission-tier.entity';
import { CreateCommissionRuleDto } from '../../api/dto/create-commission-rule.dto';

export { CreateCommissionRuleDto };

@Injectable()
export class CreateCommissionRuleUseCase {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepo: Repository<CommissionRule>,
  ) {}

  async execute(dto: CreateCommissionRuleDto): Promise<CommissionRule> {
    const rule = this.ruleRepo.create({
      name: dto.name,
      event_type: dto.event_type,
      commission_type: dto.commission_type,
      rate: dto.rate,
      rate_type: dto.rate_type ?? CommissionRateType.PERCENTAGE,
      min_cap: dto.min_cap ?? null,
      max_cap: dto.max_cap ?? null,
      applies_to_role: dto.applies_to_role ?? CommissionAppliesRole.ALL,
      applies_to_id: dto.applies_to_id ?? null,
      priority: dto.priority ?? 0,
      is_active: dto.is_active ?? true,
      effective_from: dto.effective_from ? new Date(dto.effective_from) : new Date(),
      effective_until: dto.effective_until ? new Date(dto.effective_until) : null,
      tiers: (dto.tiers ?? []).map((t) => {
        const tier = new CommissionTier();
        tier.from_amount = t.from_amount;
        tier.to_amount = t.to_amount ?? null;
        tier.rate = t.rate;
        tier.min_cap = t.min_cap ?? null;
        tier.max_cap = t.max_cap ?? null;
        return tier;
      }),
    });

    return this.ruleRepo.save(rule);
  }
}
