import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CommissionRule,
  CommissionAppliesRole,
  CommissionEventType,
  CommissionRateType,
  CommissionType,
} from '../../infrastructure/entities/commission-rule.entity';
import { CommissionTier } from '../../infrastructure/entities/commission-tier.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';

export interface ResolvedCommission {
  amount: number;
  ruleId: string | null;
}

const LEGACY_SETTING_MAP: Partial<
  Record<CommissionEventType, Partial<Record<CommissionType, string[]>>>
> = {
  [CommissionEventType.CHAT]: {
    [CommissionType.PLATFORM_FEE]: [
      'COMMISION_FROM_ASTROLOGER',
      'COMMISSION_FROM_ASTROLOGER',
    ],
    [CommissionType.SELLER_AGENT]: [
      'COMMISION_FROM_ASTROLOGER',
      'COMMISSION_FROM_ASTROLOGER',
    ],
    [CommissionType.BUYER_AGENT]: [
      'COMMISION_FOR_BUYER_AGENT',
      'COMMISSION_FOR_BUYER_AGENT',
    ],
    [CommissionType.GST]: ['GST_PERCENTAGE'],
  },
  [CommissionEventType.CALL]: {
    [CommissionType.PLATFORM_FEE]: [
      'COMMISION_FROM_ASTROLOGER',
      'COMMISSION_FROM_ASTROLOGER',
    ],
    [CommissionType.SELLER_AGENT]: [
      'COMMISION_FROM_ASTROLOGER',
      'COMMISSION_FROM_ASTROLOGER',
    ],
    [CommissionType.BUYER_AGENT]: [
      'COMMISION_FOR_BUYER_AGENT',
      'COMMISSION_FOR_BUYER_AGENT',
    ],
    [CommissionType.GST]: ['GST_PERCENTAGE'],
  },
  [CommissionEventType.PUJA]: {
    [CommissionType.PLATFORM_FEE]: [
      'COMMISION_FROM_ASTROLOGER',
      'COMMISSION_FROM_ASTROLOGER',
    ],
    [CommissionType.SELLER_AGENT]: [
      'COMMISION_FROM_ASTROLOGER',
      'COMMISSION_FROM_ASTROLOGER',
    ],
    [CommissionType.BUYER_AGENT]: [
      'COMMISION_FOR_BUYER_AGENT',
      'COMMISSION_FOR_BUYER_AGENT',
    ],
    [CommissionType.GST]: ['GST_PERCENTAGE'],
  },
  [CommissionEventType.PRODUCT_ORDER]: {
    [CommissionType.PLATFORM_FEE]: [
      'COMMISION_FROM_PUJA_SHOP',
      'COMMISSION_FROM_PUJA_SHOP',
    ],
    [CommissionType.SELLER_AGENT]: [
      'COMMISION_FROM_PUJA_SHOP',
      'COMMISSION_FROM_PUJA_SHOP',
    ],
    [CommissionType.BUYER_AGENT]: [
      'COMMISION_FOR_BUYER_AGENT',
      'COMMISSION_FOR_BUYER_AGENT',
    ],
    [CommissionType.GST]: ['GST_PERCENTAGE'],
  },
};

const DEFAULT_RATES: Partial<Record<CommissionType, number>> = {
  [CommissionType.PLATFORM_FEE]: 3,
  [CommissionType.SELLER_AGENT]: 3,
  [CommissionType.BUYER_AGENT]: 3,
  [CommissionType.GST]: 18,
};

@Injectable()
export class ResolveCommissionUseCase {
  constructor(
    @InjectRepository(CommissionRule)
    private readonly ruleRepo: Repository<CommissionRule>,
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async execute(
    eventType: CommissionEventType,
    commissionType: CommissionType,
    profileId: string | null,
    role: CommissionAppliesRole,
    grossAmount: number,
  ): Promise<ResolvedCommission> {
    const now = new Date();

    const rules = await this.ruleRepo.find({
      where: {
        event_type: eventType,
        commission_type: commissionType,
        is_active: true,
      },
      relations: ['tiers'],
      order: { priority: 'DESC' },
    });

    const activeRules = rules.filter(
      (r) =>
        r.effective_from <= now &&
        (r.effective_until === null || r.effective_until >= now),
    );

    // Specificity: individual → role → all
    const rule =
      (profileId
        ? activeRules.find((r) => r.applies_to_id === profileId)
        : undefined) ??
      activeRules.find(
        (r) => r.applies_to_role === role && r.applies_to_id === null,
      ) ??
      activeRules.find(
        (r) =>
          r.applies_to_role === CommissionAppliesRole.ALL &&
          r.applies_to_id === null,
      );

    if (!rule) {
      const legacyAmount = await this.fromLegacySetting(
        eventType,
        commissionType,
        grossAmount,
      );
      return { amount: legacyAmount, ruleId: null };
    }

    const tier = this.matchTier(rule.tiers ?? [], grossAmount);
    const effectiveRate = tier?.rate ?? rule.rate;
    const effectiveMinCap = tier?.min_cap ?? rule.min_cap;
    const effectiveMaxCap = tier?.max_cap ?? rule.max_cap;

    let raw =
      rule.rate_type === CommissionRateType.FIXED
        ? Number(effectiveRate)
        : grossAmount * (Number(effectiveRate) / 100);

    if (effectiveMinCap !== null && effectiveMinCap !== undefined) {
      raw = Math.max(raw, Number(effectiveMinCap));
    }
    if (effectiveMaxCap !== null && effectiveMaxCap !== undefined) {
      raw = Math.min(raw, Number(effectiveMaxCap));
    }

    return { amount: Number(raw.toFixed(2)), ruleId: rule.id };
  }

  private matchTier(
    tiers: CommissionTier[],
    grossAmount: number,
  ): CommissionTier | undefined {
    return tiers.find(
      (t) =>
        grossAmount >= Number(t.from_amount) &&
        (t.to_amount === null || grossAmount <= Number(t.to_amount)),
    );
  }

  private async fromLegacySetting(
    eventType: CommissionEventType,
    commissionType: CommissionType,
    grossAmount: number,
  ): Promise<number> {
    const keys = LEGACY_SETTING_MAP[eventType]?.[commissionType] ?? [];
    for (const key of keys) {
      const setting = await this.settingRepo.findOne({ where: { key } });
      if (setting?.value) {
        const rate = parseFloat(setting.value);
        if (commissionType === CommissionType.GST) {
          // GST is applied on the platform_fee, not gross — caller must handle
          return rate;
        }
        return Number((grossAmount * (rate / 100)).toFixed(2));
      }
    }
    const defaultRate = DEFAULT_RATES[commissionType] ?? 3;
    if (commissionType === CommissionType.GST) return defaultRate;
    return Number((grossAmount * (defaultRate / 100)).toFixed(2));
  }
}
