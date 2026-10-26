import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb, DrizzleTx } from '@/core/drizzledb/drizzle.types';
import {
  consultationBillings,
  promotionBenefitLedger,
  promotionBenefits,
  promotionDefinitions,
  promotionWallets,
} from '@/core/drizzledb/schema';

/** Single seeded spec for the v2 welcome promotion. */
export const WELCOME_PROMO_CODE = 'WELCOME_CHAT_5';

export interface ActivePromotionView {
  code: string;
  name: string;
  benefitType: string;
  remainingSeconds: number;
}

export interface PromotionLossStats {
  consultationCount: number;
  totalPromotionalDiscount: number;
  totalProviderContribution: number;
  totalPlatformSubsidy: number;
  totalWalletDeduction: number;
  totalConsumedSeconds: number;
}

type Runner = DrizzleDb | DrizzleTx;

interface BenefitRow {
  id: number;
  granted_seconds: number;
  consumed_seconds: number;
}

const notExpired = () =>
  or(
    isNull(promotionBenefits.expires_at),
    gt(promotionBenefits.expires_at, new Date()),
  );

@Injectable()
export class PromotionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Grant the welcome promotion to a brand-new client account. Idempotent:
   * re-grants are a no-op, so registration retries and provider logins are
   * safe. Runs inside the caller's transaction when provided.
   */
  async grantWelcomePromotion(
    clientId: number,
    tx?: DrizzleTx,
  ): Promise<{ remainingSeconds: number } | null> {
    const runner: Runner = tx ?? this.db;

    const [definition] = await runner
      .select()
      .from(promotionDefinitions)
      .where(
        and(
          eq(promotionDefinitions.code, WELCOME_PROMO_CODE),
          eq(promotionDefinitions.status, 'active'),
        ),
      )
      .limit(1);
    if (!definition) return null;

    const existing = await runner
      .select({
        granted_seconds: promotionBenefits.granted_seconds,
        consumed_seconds: promotionBenefits.consumed_seconds,
      })
      .from(promotionBenefits)
      .where(
        and(
          eq(promotionBenefits.definition_id, definition.id),
          eq(promotionBenefits.client_id, clientId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Re-grant is a no-op; report what the existing benefit still holds.
      return {
        remainingSeconds: Math.max(
          existing[0].granted_seconds - existing[0].consumed_seconds,
          0,
        ),
      };
    }

    if (existing.length === 0) {
      // Upsert keeps re-grants safe under concurrent registrations.
      const [wallet] = await runner
        .insert(promotionWallets)
        .values({ client_id: clientId })
        .onConflictDoUpdate({
          target: promotionWallets.client_id,
          set: { updated_at: new Date() },
        })
        .returning({ id: promotionWallets.id });

      const [benefit] = await runner
        .insert(promotionBenefits)
        .values({
          wallet_id: wallet.id,
          definition_id: definition.id,
          client_id: clientId,
          benefit_type: definition.benefit_type,
          granted_seconds: definition.benefit_quantity,
        })
        .returning({ id: promotionBenefits.id });

      await runner.insert(promotionBenefitLedger).values({
        benefit_id: benefit.id,
        delta_seconds: definition.benefit_quantity,
        balance_after: definition.benefit_quantity,
        reason: 'welcome_grant',
      });
    }

    return { remainingSeconds: definition.benefit_quantity };
  }

  /**
   * Remaining usable promo chat seconds for a client. Only benefits whose
   * definition is still active count — retiring the spec is the kill switch.
   */
  async getActiveChatBenefitSeconds(
    clientId: number,
    tx?: DrizzleTx,
  ): Promise<number> {
    const runner: Runner = tx ?? this.db;
    const [row] = await runner
      .select({
        remainingSeconds:
          sql<number>`coalesce(sum(greatest(${promotionBenefits.granted_seconds} - ${promotionBenefits.consumed_seconds}, 0)), 0)::int`.mapWith(
            Number,
          ),
      })
      .from(promotionBenefits)
      .innerJoin(
        promotionDefinitions,
        eq(promotionBenefits.definition_id, promotionDefinitions.id),
      )
      .where(
        and(
          eq(promotionBenefits.client_id, clientId),
          eq(promotionBenefits.benefit_type, 'chat_seconds'),
          eq(promotionDefinitions.status, 'active'),
          notExpired(),
        ),
      );
    return row?.remainingSeconds ?? 0;
  }

  /** Active welcome-promotion view for the client-facing surface. */
  async getActivePromotions(clientId: number): Promise<ActivePromotionView[]> {
    const remainingSeconds = await this.getActiveChatBenefitSeconds(clientId);
    if (remainingSeconds <= 0) return [];
    const rows = await this.db
      .select({
        code: promotionDefinitions.code,
        name: promotionDefinitions.name,
        benefitType: promotionDefinitions.benefit_type,
        remainingSeconds:
          sql<number>`greatest(${promotionBenefits.granted_seconds} - ${promotionBenefits.consumed_seconds}, 0)::int`.mapWith(
            Number,
          ),
      })
      .from(promotionBenefits)
      .innerJoin(
        promotionDefinitions,
        eq(promotionBenefits.definition_id, promotionDefinitions.id),
      )
      .where(
        and(
          eq(promotionBenefits.client_id, clientId),
          eq(promotionBenefits.benefit_type, 'chat_seconds'),
          eq(promotionDefinitions.status, 'active'),
          notExpired(),
        ),
      )
      .orderBy(desc(promotionBenefits.id));
    return rows;
  }

  /**
   * Burn promotional seconds against an actual consultation. FIFO across
   * the client's active benefits; consumption is capped by remaining
   * seconds, never pre-charged. Returns the consumed split.
   */
  async consumePromotionalSeconds(
    clientId: number,
    consultationId: number,
    durationSeconds: number,
    tx?: DrizzleTx,
  ): Promise<{ consumedSeconds: number; benefitId: number | null }> {
    const runner: Runner = tx ?? this.db;
    let quota = Math.max(0, Math.floor(durationSeconds));
    let consumedTotal = 0;
    let lastBenefitId: number | null = null;

    if (quota > 0) {
      const benefits: BenefitRow[] = await runner
        .select({
          id: promotionBenefits.id,
          granted_seconds: promotionBenefits.granted_seconds,
          consumed_seconds: promotionBenefits.consumed_seconds,
        })
        .from(promotionBenefits)
        .innerJoin(
          promotionDefinitions,
          eq(promotionBenefits.definition_id, promotionDefinitions.id),
        )
        .where(
          and(
            eq(promotionBenefits.client_id, clientId),
            eq(promotionBenefits.benefit_type, 'chat_seconds'),
            eq(promotionDefinitions.status, 'active'),
            notExpired(),
          ),
        )
        .orderBy(promotionBenefits.id);

      for (const benefit of benefits) {
        if (quota <= 0) break;
        const remaining =
          benefit.granted_seconds - benefit.consumed_seconds;
        if (remaining <= 0) continue;
        const take = Math.min(remaining, quota);
        const balanceAfter = remaining - take;
        await runner
          .update(promotionBenefits)
          .set({ consumed_seconds: benefit.consumed_seconds + take })
          .where(eq(promotionBenefits.id, benefit.id));
        await runner.insert(promotionBenefitLedger).values({
          benefit_id: benefit.id,
          consultation_id: consultationId,
          delta_seconds: -take,
          balance_after: balanceAfter,
          reason: 'consultation_consumption',
        });
        quota -= take;
        consumedTotal += take;
        lastBenefitId = benefit.id;
      }
    }

    return { consumedSeconds: consumedTotal, benefitId: lastBenefitId };
  }

  /** Admin-side promotional loss view over billings settlements. */
  async getLossStats(): Promise<PromotionLossStats> {
    const [row] = await this.db
      .select({
        consultationCount:
          sql<number>`count(*)::int`.mapWith(Number),
        totalPromotionalDiscount:
          sql<number>`coalesce(sum(${consultationBillings.promotional_discount}), 0)::float`.mapWith(
            Number,
          ),
        totalProviderContribution:
          sql<number>`coalesce(sum(${consultationBillings.provider_contribution}), 0)::float`.mapWith(
            Number,
          ),
        totalPlatformSubsidy:
          sql<number>`coalesce(sum(${consultationBillings.platform_subsidy}), 0)::float`.mapWith(
            Number,
          ),
        totalWalletDeduction:
          sql<number>`coalesce(sum(${consultationBillings.wallet_deduction}), 0)::float`.mapWith(
            Number,
          ),
        totalConsumedSeconds:
          sql<number>`coalesce(sum(${consultationBillings.consumed_promotional_seconds}), 0)::int`.mapWith(
            Number,
          ),
      })
      .from(consultationBillings);
    return {
      consultationCount: row?.consultationCount ?? 0,
      totalPromotionalDiscount: row?.totalPromotionalDiscount ?? 0,
      totalProviderContribution: row?.totalProviderContribution ?? 0,
      totalPlatformSubsidy: row?.totalPlatformSubsidy ?? 0,
      totalWalletDeduction: row?.totalWalletDeduction ?? 0,
      totalConsumedSeconds: row?.totalConsumedSeconds ?? 0,
    };
  }
}
