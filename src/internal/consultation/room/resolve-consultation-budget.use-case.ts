import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultations,
  consultationSessions,
  clientAccounts,
  clientWallets,
  expertAccounts,
  expertConsultationPricing,
} from '@/core/drizzledb/schema';
import {
  PricingStatus,
  PricingTargetAudience,
} from '@/core/enums';
import {
  ConsultationMode,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { ConsultationRoomRepository } from './consultation-room.repository';
import type { BudgetSnapshot } from './consultation-room.repository';
import { PromotionsService } from '@/internal/promotions/promotions.service';

export interface ConsultationBudget {
  /** Display budget: affordable minutes from the current wallet balance. */
  maxMinutes: number;
  /** Live anchor for the countdown (resume anchor or session start), null before start. */
  startedAt: string | null;
  /** Elapsed seconds against the anchor (includes pre-resume base), 0 before start. */
  elapsedSeconds: number;
  /** Rate the budget currently burns at — the active mode's price. */
  ratePerMinute: number;
  /** Mode the rate was picked for (stored active mode, CHAT default). */
  mode: ConsultationMode;
  /** Current wallet balance (initiate-style, balance-only). */
  balance: number;
  isEligibleForFree: boolean;
  freeMinutes: number;
}

export interface ModeRates {
  chat: number;
  call: number;
  videoCall: number;
}

/**
 * Live affordable minutes from a snapshot plus the wallet-balance delta
 * since the snapshot. Wallet-only: recharges extend the budget, external
 * spends shrink it, and the mid-chat HOLD never appears (it left `balance`
 * before the snapshot). No upper cap — a client may hold as many minutes
 * as the wallet covers. The free grant is fixed: no delta while on it.
 */
export function effectiveMaxMinutes(
  snap: BudgetSnapshot,
  liveBalance: number,
  ratePerMinute: number,
): number {
  if (ratePerMinute <= 0) return snap.maxMinutes;
  if (snap.freeBasis === 1) {
    // The free grant is fixed; wallet funds beyond it buy balance-priced
    // minutes, so a recharged consultation is no longer stuck on the
    // trial budget (hold/resume would otherwise pin it to 5 minutes).
    return snap.maxMinutes + Math.floor(liveBalance / ratePerMinute);
  }
  return snap.maxMinutes + Math.floor((liveBalance - snap.balanceAtSnap) / ratePerMinute);
}

/**
 * Live display budget for the shared consultation meter — one countdown for
 * chat, audio calls, and video calls. The countdown basis is the
 * initiate-time snapshot (`consultation:budget:{id}`, captured from the
 * pre-hold wallet balance) plus the wallet-balance delta since — never
 * `reserved_balance`, so the 5-minute HOLD can't shrink the timer mid-chat.
 * The burn rate follows the stored active mode (`consultation:mode:{id}`,
 * CHAT default) using that mode's price from the expert's
 * consultation-pricing row (account price as fallback). Falls back to
 * floor(balance / rate) when no snapshot exists (rooms armed before this
 * change). Display-only: never gates holds or settlement, which own their
 * own reads.
 */
@Injectable()
export class ResolveConsultationBudgetUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly promotions: PromotionsService,
  ) {}

  async execute(
    consultationId: number,
    modeOverride?: ConsultationMode,
  ): Promise<ConsultationBudget | null> {
    const [consultation] = await this.db
      .select({
        id: consultations.id,
        client_id: consultations.client_id,
        expert_id: consultations.expert_id,
      })
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);
    if (!consultation) return null;

    const [rates, funds, free, session, storedMode] = await Promise.all([
      this.fetchModeRates(consultation.expert_id),
      this.fetchBalance(consultation.client_id),
      this.fetchFreeEligibility(consultation.client_id),
      this.fetchLatestSession(consultationId),
      this.rooms.getActiveMode(consultationId),
    ]);
    if (rates === null || funds === null) return null;

    const mode =
      modeOverride ??
      (storedMode === ConsultationMode.VOICE ||
      storedMode === ConsultationMode.VIDEO
        ? storedMode
        : ConsultationMode.CHAT);
    // Promotional free minutes are a chat-only spec; other modes pay.
    const isEligibleForFree =
      mode === ConsultationMode.CHAT ? free.isEligibleForFree : false;
    const freeMinutes = isEligibleForFree ? free.freeMinutes : 0;
    const ratePerMinute =
      mode === ConsultationMode.VOICE
        ? rates.call
        : mode === ConsultationMode.VIDEO
          ? rates.videoCall
          : rates.chat;

    const snap = await this.rooms.getBudget(consultationId);
    const freshMinutes =
      isEligibleForFree || ratePerMinute <= 0
        ? freeMinutes
        : Math.floor(funds / ratePerMinute);
    // Snapshot wins so the post-hold balance can't shrink the countdown;
    // the wallet delta still lets recharges extend it (no upper cap).
    // Minimum>=5 is enforced at initiate (hold gate); live value may sit
    // below that after external spends — the pause check then fires at once.
    const maxMinutes = snap
      ? effectiveMaxMinutes(snap, funds, ratePerMinute)
      : freshMinutes;

    const startedAt = session?.started_at
      ? session.started_at.toISOString()
      : null;
    // Resume anchor wins over the session start so rejoins after a resume
    // agree with resumed clients; baseSeconds carries pre-resume consumption.
    const anchor = await this.rooms.getAnchor(consultationId);
    const anchorIso = anchor?.anchorIso ?? startedAt;
    const baseSeconds = anchor?.baseSeconds ?? 0;
    const elapsedSeconds = anchorIso
      ? baseSeconds +
        Math.max(
          0,
          Math.floor((Date.now() - new Date(anchorIso).getTime()) / 1000),
        )
      : 0;

    return {
      maxMinutes,
      startedAt: anchorIso,
      elapsedSeconds,
      ratePerMinute,
      mode,
      balance: funds,
      isEligibleForFree,
      freeMinutes,
    };
  }

  /**
   * All three metered rates. Active ALL-audience pricing row wins per mode;
   * a null leg falls back to the matching account price. Null overall when
   * the expert row is missing or no leg resolves (caller treats as
   * unresolvable, same as before).
   */
  private async fetchModeRates(expertId: number): Promise<ModeRates | null> {
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
    const call = pick(row.activeCallPrice, row.fallbackCallPrice);
    const videoCall = pick(
      row.activeVideoCallPrice,
      row.fallbackVideoCallPrice,
    );
    if (chat === null || call === null || videoCall === null) return null;
    return { chat, call, videoCall };
  }

  private async fetchBalance(clientId: number): Promise<number | null> {
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
