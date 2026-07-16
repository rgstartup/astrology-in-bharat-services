import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRule } from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';
import { CommissionTier } from '@/modules/finance/commissions/infrastructure/entities/commission-tier.entity';
import { UpdateCommissionRuleDto } from '../../api/dto/update-commission-rule.dto';

export { UpdateCommissionRuleDto };

@Injectable()
export class UpdateCommissionRuleUseCase {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepo: Repository<CommissionRule>,
    @InjectRepository(CommissionTier)
    private readonly tierRepo: Repository<CommissionTier>,
  ) {}

  async execute(
    id: string,
    dto: UpdateCommissionRuleDto,
  ): Promise<CommissionRule> {
    const rule = await this.ruleRepo.findOne({
      where: { id },
      relations: ['tiers'],
    });
    if (!rule) throw new NotFoundException(`Commission rule ${id} not found`);

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.event_type !== undefined) rule.event_type = dto.event_type;
    if (dto.commission_type !== undefined)
      rule.commission_type = dto.commission_type;
    if (dto.rate !== undefined) rule.rate = dto.rate;
    if (dto.rate_type !== undefined) rule.rate_type = dto.rate_type;
    if ('min_cap' in dto) rule.min_cap = dto.min_cap ?? null;
    if ('max_cap' in dto) rule.max_cap = dto.max_cap ?? null;
    if (dto.applies_to_role !== undefined)
      rule.applies_to_role = dto.applies_to_role;
    if ('applies_to_id' in dto) rule.applies_to_id = dto.applies_to_id ?? null;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.is_active !== undefined) rule.is_active = dto.is_active;
    if (dto.effective_from !== undefined)
      rule.effective_from = new Date(dto.effective_from);
    if ('effective_until' in dto)
      rule.effective_until = dto.effective_until
        ? new Date(dto.effective_until)
        : null;

    if (dto.tiers !== undefined) {
      await this.tierRepo.delete({ rule_id: rule.id });
      rule.tiers = dto.tiers.map((t) => {
        const tier = new CommissionTier();
        tier.rule_id = rule.id;
        tier.from_amount = t.from_amount;
        tier.to_amount = t.to_amount ?? null;
        tier.rate = t.rate;
        tier.min_cap = t.min_cap ?? null;
        tier.max_cap = t.max_cap ?? null;
        return tier;
      });
    }

    return this.ruleRepo.save(rule);
  }
}
