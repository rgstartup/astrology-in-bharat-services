import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EarningPolicy } from '../entities/earning-policy.entity';
import {
  EarningEventType,
  EarningRateType,
  EarningAppliesRole,
} from '../enums';
import {
  CalculateEarningsInput,
  CalculatedEarningsResult,
} from '../dto/calculate-earnings.dto';

@Injectable()
export class CalculateEarningsUseCase {
  private readonly logger = new Logger(CalculateEarningsUseCase.name);

  constructor(
    @InjectRepository(EarningPolicy)
    private readonly policyRepo: Repository<EarningPolicy>,
  ) {}

  async execute(
    input: CalculateEarningsInput,
  ): Promise<CalculatedEarningsResult> {
    const now = new Date();
    const gross = Number(input.grossAmount) || 0;
    const durationMins = Number(input.durationMinutes) || 1;

    // 1. Look for specific override policy first (by user id), then fallback to global active rule
    const qb = this.policyRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tiers', 'tiers')
      .where('p.event_type = :eventType', { eventType: input.eventType })
      .andWhere('p.is_active = true')
      .andWhere('p.effective_from <= :now', { now })
      .andWhere('(p.effective_to IS NULL OR p.effective_to >= :now)', { now })
      .andWhere('p.min_amount <= :gross', { gross })
      .orderBy('p.priority', 'DESC');

    if (input.providerProfileId) {
      qb.andWhere(
        '(p.applies_to_user_id IS NULL OR p.applies_to_user_id = :providerId)',
        { providerId: input.providerProfileId },
      );
    } else {
      qb.andWhere('p.applies_to_user_id IS NULL');
    }

    const policy = await qb.getOne();

    // Default Fallbacks if no policy configured yet
    let platformRate = policy ? Number(policy.platform_cut_value) : 2.0; // Default ₹2
    const rateType = policy ? policy.platform_cut_type : EarningRateType.FIXED;
    const gstRatePercent = policy ? Number(policy.gst_rate_percent) : 18.0;
    const sellerAgentRate = policy ? Number(policy.seller_agent_rate) : 0;
    const buyerAgentRate = policy ? Number(policy.buyer_agent_rate) : 0;
    const referralReward = policy ? Number(policy.referral_reward_amount) : 0;

    // Check if Tiered Rate applies
    if (policy && policy.tiers && policy.tiers.length > 0) {
      const matchingTier = policy.tiers.find(
        (t) =>
          gross >= Number(t.min_threshold) &&
          (t.max_threshold === null || gross <= Number(t.max_threshold)),
      );
      if (matchingTier) {
        platformRate = Number(matchingTier.platform_rate);
      }
    }

    // 2. Calculate Platform Cut
    let platformEarning = 0;
    if (
      input.eventType === EarningEventType.CALL ||
      input.eventType === EarningEventType.CHAT
    ) {
      // Per-minute rate for consultations (e.g. ₹2/min * 10 mins = ₹20)
      if (rateType === EarningRateType.FIXED) {
        platformEarning = platformRate * durationMins;
      } else {
        platformEarning = (gross * platformRate) / 100;
      }
    } else {
      // Percentage or fixed take-rate for products / pujas
      if (rateType === EarningRateType.PERCENTAGE) {
        platformEarning = (gross * platformRate) / 100;
      } else {
        platformEarning = platformRate;
      }
    }

    if (policy?.max_cap && platformEarning > Number(policy.max_cap)) {
      platformEarning = Number(policy.max_cap);
    }

    // Ensure platform cut doesn't exceed gross
    platformEarning = Math.min(platformEarning, gross);
    platformEarning = Number(platformEarning.toFixed(2));

    // GST component on platform earnings
    const gstOnPlatformFee = Number(
      ((platformEarning * gstRatePercent) / (100 + gstRatePercent)).toFixed(2),
    );

    // 3. Third-party Agent & Referral Cuts
    const sellerAgentEarning = Number((gross * sellerAgentRate).toFixed(2));
    const buyerAgentEarning = Number((gross * buyerAgentRate).toFixed(2));
    const referralEarning = Number(referralReward.toFixed(2));

    // 4. Provider Net Earning
    const totalDeductions =
      platformEarning + sellerAgentEarning + buyerAgentEarning;
    const providerEarning = Number(
      Math.max(0, gross - totalDeductions).toFixed(2),
    );

    return {
      grossAmount: gross,
      platformEarning,
      gstOnPlatformFee,
      providerEarning,
      sellerAgentEarning,
      buyerAgentEarning,
      referralEarning,
      policyId: policy ? policy.id : null,
    };
  }
}
