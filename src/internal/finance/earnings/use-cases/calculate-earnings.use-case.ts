import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  earningPolicies,
  earningTiers,
} from '@/core/drizzledb/schema';
import { EarningType } from '@/core/enums';
import { EarningEventType, EarningRateType } from '../enum';
import {
  CalculateEarningsInput,
  CalculatedEarningsResult,
} from '../dto/calculate-earnings.dto';

@Injectable()
export class CalculateEarningsUseCase {
  private readonly logger = new Logger(CalculateEarningsUseCase.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async execute(
    input: CalculateEarningsInput,
  ): Promise<CalculatedEarningsResult> {
    const now = new Date();
    const gross = Number(input.grossAmount) || 0;
    const durationMins = Number(input.durationMinutes) || 1;

    // 1. Look for active policy if configured
    const policy = await this.db.query.earningPolicies.findFirst({
      where: and(
        lte(earningPolicies.effective_from, now),
        or(
          isNull(earningPolicies.effective_until),
          gte(earningPolicies.effective_until, now),
        ),
      ),
    });

    // Default Fallbacks
    let platformRate = 2.0; // Default ₹2
    let rateType: EarningRateType = EarningRateType.FIXED;
    const gstRatePercent = 18.0;
    const sellerAgentRate = 0;
    const buyerAgentRate = 0;

    // Check if Tiered Rate applies if policy found
    if (policy) {
      if (policy.type === EarningType.PRODUCT_SALE) {
        rateType = EarningRateType.PERCENTAGE;
      }
      const tiers = await this.db.query.earningTiers.findMany({
        where: eq(earningTiers.policy_id, policy.id),
      });
      const matchingTier = tiers.find(
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

    // Ensure platform cut doesn't exceed gross
    platformEarning = Math.min(platformEarning, gross);
    platformEarning = Number(platformEarning.toFixed(2));

    // GST component on platform earnings
    const gstOnPlatformFee = Number(
      ((platformEarning * gstRatePercent) / (100 + gstRatePercent)).toFixed(2),
    );

    // 3. Third-party Dedicated Agent Commissions
    const sellerAgentEarning = Number((gross * sellerAgentRate).toFixed(2));
    const buyerAgentEarning = Number((gross * buyerAgentRate).toFixed(2));

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
      policyId: policy ? policy.id : null,
    };
  }
}
