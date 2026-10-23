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

    // Free grant calculation
    const isEligibleForFree = freeInfo.isEligibleForFree;
    const freeMinutes = freeInfo.freeMinutes;

    // Snapshot from Redis
    const snap = await this.rooms.getBudget(consultationId);
    let maxMinutes: number;

    if (snap) {
      if (snap.freeBasis === 1 || ratePerMinute <= 0) {
        maxMinutes = snap.maxMinutes;
      } else {
        // Delta since snapshot
        maxMinutes =
          snap.maxMinutes +
          Math.floor((spendableBalance - snap.balanceAtSnap) / ratePerMinute);
      }
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
    const [row] = await this.db
      .select({
        completedCount:
          sql<number>`(select count(*)::int from ${consultations} where ${consultations.client_id} = ${clientAccounts.id} and ${consultations.mode} = ${ConsultationMode.CHAT} and ${consultations.status} = ${ConsultationStatus.COMPLETED})`.mapWith(
            Number,
          ),
      })
      .from(clientAccounts)
      .where(eq(clientAccounts.id, clientId))
      .limit(1);

    const isEligibleForFree =
      process.env.FREE_CHAT_ENABLED === 'true' &&
      (row?.completedCount ?? 0) === 0;

    const freeMinutes = isEligibleForFree
      ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
      : 0;

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
