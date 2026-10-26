import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientAccounts,
  clientWallets,
  consultationSessions,
  consultations,
  expertAccounts,
  expertConsultationPricing,
} from '@/core/drizzledb/schema';
import {
  ConsultationMode,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { PricingStatus, PricingTargetAudience } from '@/core/enums';
import { ConsultationRoomRepository } from '../room/consultation-room.repository';
import { effectiveMaxMinutes } from '../room/resolve-consultation-budget.use-case';
import { PromotionsService } from '@/internal/promotions/promotions.service';
import {
  ConsultationModeType,
  toConsultationModeEnum,
  toConsultationModeType,
} from './consultation-orchestrator.types';

export interface CalculatedAffordability {
  consultationId: number;
  mode: ConsultationModeType;
  ratePerMinute: number;
  costPerSecond: number;
  spendableBalance: number;
  affordableSeconds: number;
  maxMinutes: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  isEligibleForFree: boolean;
  freeMinutes: number;
  startedAt: string | null;
}

export interface ModeRates {
  chat: number;
  voice: number;
  video: number;
}

@Injectable()
export class ConsultationBudgetEngine {
  private readonly logger = new Logger(ConsultationBudgetEngine.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly promotions: PromotionsService,
  ) {}

  /**
   * Authoritative affordability calculation for a consultation.
   * Resolves mode rate, client spendable balance, elapsed seconds from anchor,
   * and computes precise remaining seconds.
   */
  async calculateAffordability(
    consultationId: number,
    modeOverride?: ConsultationModeType,
  ): Promise<CalculatedAffordability | null> {
    const [consultation] = await this.db
      .select({
        id: consultations.id,
        clientId: consultations.client_id,
        expertId: consultations.expert_id,
        storedMode: consultations.mode,
      })
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (!consultation) return null;

    const [
      rates,
      spendableBalance,
      freeInfo,
      session,
      redisActiveMode,
      billingHeld,
    ] = await Promise.all([
      this.fetchRates(consultation.expertId),
      this.fetchSpendableBalance(consultation.clientId),
      this.fetchFreeEligibility(consultation.clientId),
      this.fetchLatestSession(consultationId),
      this.rooms.getActiveMode(consultationId),
      this.rooms.isBillingHeld(consultationId),
    ]);

    if (!rates || spendableBalance === null) return null;

    // Mode resolution priority: modeOverride -> redis active mode -> DB stored mode -> chat
    const resolvedModeStr =
      modeOverride ??
      (redisActiveMode
        ? toConsultationModeType(redisActiveMode)
        : toConsultationModeType(consultation.storedMode));

    const ratePerMinute =
      resolvedModeStr === 'voice'
        ? rates.voice
        : resolvedModeStr === 'video'
          ? rates.video
          : rates.chat;

    const costPerSecond = ratePerMinute > 0 ? ratePerMinute / 60 : 0;

    // Free grant calculation — chat-mode only (the promotion is a chat spec).
    const isEligibleForFree =
      freeInfo.isEligibleForFree && resolvedModeStr === 'chat';
    const freeMinutes = isEligibleForFree ? freeInfo.freeMinutes : 0;

    // Snapshot from Redis
    const snap = await this.rooms.getBudget(consultationId);
    let maxMinutes: number;

    if (snap) {
      // Shared snapshot math: fixed free grant, recharge-aware extension.
      maxMinutes = effectiveMaxMinutes(snap, spendableBalance, ratePerMinute);
    } else {
      maxMinutes = isEligibleForFree
        ? freeMinutes
        : ratePerMinute > 0
          ? Math.floor(spendableBalance / ratePerMinute)
          : 0;
    }

    const startedAt = session?.started_at
      ? session.started_at.toISOString()
      : null;

    // Anchors for elapsed calculation
    const anchor = await this.rooms.getAnchor(consultationId);
    const anchorIso = anchor?.anchorIso ?? startedAt;
    const baseSeconds = anchor?.baseSeconds ?? 0;

    // A billing hold freezes the clock at the seconds consumed before it:
    // the anchor was re-written at hold time, so ignore its drift entirely.
    const elapsedSeconds = billingHeld
      ? baseSeconds
      : anchorIso
        ? baseSeconds +
          Math.max(
            0,
            Math.floor((Date.now() - new Date(anchorIso).getTime()) / 1000),
          )
        : 0;

    const affordableSeconds = maxMinutes * 60;
    const remainingSeconds = Math.max(0, affordableSeconds - elapsedSeconds);

    return {
      consultationId,
      mode: resolvedModeStr,
      ratePerMinute,
      costPerSecond,
      spendableBalance,
      affordableSeconds,
      maxMinutes,
      elapsedSeconds,
      remainingSeconds,
      isEligibleForFree,
      freeMinutes,
      startedAt: anchorIso,
    };
  }

  /**
   * Checks if consultation has exhausted available budget.
   */
  async isBudgetExhausted(
    consultationId: number,
    modeOverride?: ConsultationModeType,
  ): Promise<boolean> {
    const affordability = await this.calculateAffordability(
      consultationId,
      modeOverride,
    );
    if (!affordability) return false;
    // Inexhaustible rate
    if (affordability.ratePerMinute <= 0 && !affordability.isEligibleForFree) {
      return false;
    }
    return affordability.remainingSeconds <= 0;
  }

  /**
   * Fetch rates for all three modes: chat, voice, video.
   */
  private async fetchRates(expertId: number): Promise<ModeRates | null> {
    const now = new Date();
    const [row] = await this.db
      .select({
        fallbackChatPrice: expertAccounts.chat_price,
        fallbackCallPrice: expertAccounts.call_price,
        fallbackVideoCallPrice: expertAccounts.video_call_price,
        activeChatPrice: expertConsultationPricing.chat_price,
        activeCallPrice: expertConsultationPricing.call_price,
        activeVideoCallPrice: expertConsultationPricing.video_call_price,
      })
      .from(expertAccounts)
      .leftJoin(
        expertConsultationPricing,
        and(
          eq(expertAccounts.id, expertConsultationPricing.expert_id),
          eq(expertConsultationPricing.is_active, true),
          eq(expertConsultationPricing.status, PricingStatus.ACTIVE),
          eq(
            expertConsultationPricing.target_audience,
            PricingTargetAudience.ALL,
          ),
          lte(expertConsultationPricing.effective_from, now),
          or(
            isNull(expertConsultationPricing.effective_to),
            gt(expertConsultationPricing.effective_to, now),
          ),
        ),
      )
      .where(eq(expertAccounts.id, expertId))
      .orderBy(desc(expertConsultationPricing.effective_from))
      .limit(1);

    if (!row) return null;

    const pick = (active: unknown, fallback: unknown): number | null => {
      const raw = active != null ? Number(active) : fallback;
      return raw == null || Number.isNaN(Number(raw)) ? null : Number(raw);
    };

    const chat = pick(row.activeChatPrice, row.fallbackChatPrice);
    const voice = pick(row.activeCallPrice, row.fallbackCallPrice);
    const video = pick(row.activeVideoCallPrice, row.fallbackVideoCallPrice);

    if (chat === null || voice === null || video === null) return null;
    return { chat, voice, video };
  }

  /**
   * Spendable balance = balance in client wallet.
   */
  private async fetchSpendableBalance(
    clientId: number,
  ): Promise<number | null> {
    const [wallet] = await this.db
      .select({ balance: clientWallets.balance })
      .from(clientWallets)
      .where(eq(clientWallets.client_id, clientId))
      .limit(1);

    if (!wallet) return null;
    return Number(wallet.balance);
  }

  private async fetchFreeEligibility(clientId: number) {
    // Promotion replaces the env free trial: unspent granted chat seconds.
    const remainingSeconds =
      await this.promotions.getActiveChatBenefitSeconds(clientId);
    const freeMinutes = Math.floor(remainingSeconds / 60);
    const isEligibleForFree = freeMinutes > 0;
    return { isEligibleForFree, freeMinutes };
  }

  private async fetchLatestSession(consultationId: number) {
    const [session] = await this.db
      .select({ started_at: consultationSessions.started_at })
      .from(consultationSessions)
      .where(eq(consultationSessions.consultation_id, consultationId))
      .orderBy(desc(consultationSessions.id))
      .limit(1);

    return session ?? null;
  }
}
