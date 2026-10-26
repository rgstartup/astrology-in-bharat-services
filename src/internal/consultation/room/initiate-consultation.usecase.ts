import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, ne } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  consultations,
  consultationSessions,
  clientAccounts,
  clientTransactions,
  clientWallets,
} from "@/core/drizzledb/schema";
import {
  ConsultationMode,
  ConsultationSessionStatus,
  ConsultationStatus,
} from "@/internal/consultation/enums";
import { ConsultationRoomRepository } from "@/internal/consultation/room/consultation-room.repository";
import { effectiveMaxMinutes } from "@/internal/consultation/room/resolve-consultation-budget.use-case";
import type { ConsultationModeType } from "@/internal/consultation/orchestrator/consultation-orchestrator.types";
import { toConsultationModeEnum } from "@/internal/consultation/orchestrator/consultation-orchestrator.types";
import { ClientTransactionPurpose } from "@/internal/actors/client/wallet/enum";
import { ClientTransactionType } from "@/internal/actors/client/wallet/enum";
import { CheckChatEligibilityUsecase } from "@/internal/actors/client/consultation/chat/use-cases/check-chat-eligibility.usecase";
import { CheckVoiceEligibilityUsecase } from "@/internal/actors/client/consultation/voice/use-cases/check-voice-eligibility.usecase";
import {
  ExpertUnavailableError,
  InsufficientBalanceError,
} from "@/internal/actors/client/consultation/errors";
import {
  ActiveConsultationExistsError,
  ClientNotFoundError,
  ConsultationNotAvailableError,
  ExpertBusyInConsultationError,
} from "@/internal/actors/client/consultation/chat/errors";
import { randomUUIDv7 } from "node:crypto";

/** Consultation states that still block a new request. */
const OPEN_STATUSES = [
  ConsultationStatus.REQUESTED,
  ConsultationStatus.REOPENED,
  ConsultationStatus.ACCEPTED,
  ConsultationStatus.ACTIVE,
];

/**
 * Canonical response of every initiate flow. Structurally identical to
 * the per-mode response DTOs — ids only, no wallet figures.
 */
export interface InitiateConsultationResult {
  consultationId: number;
  sessionId: number;
  maxMinutes: number;
  requestExpiresInSec: number;
}

interface PricingQuote {
  pricePerMinute: number;
  isEligibleForFree: boolean;
  freeMinutes: number;
  minBalanceRequired: number;
}

/**
 * Single canonical initiate flow for client consultations.
 *
 * Owns the full request lifecycle for both chat and voice modes:
 * client lookup, mode-specific eligibility + availability gate, then
 * either attach a fresh session to an existing open consultation or
 * create a new consultation with its first session, HOLD the minimum
 * balance, arm the room key, and seed the budget snapshot. Every call
 * creates a NEW session row — no resume.
 *
 * Throws mode-agnostic domain errors:
 * - `PRICE_NOT_FOUND` when the expert has no price for the requested mode
 * - `INSUFFICIENT_BALANCE` when the wallet cannot cover the hold
 * - `EXPERT_UNAVAILABLE` when the expert is offline
 * - `ACTIVE_CONSULTATION_EXISTS` when the client already has an open one
 * - `EXPERT_BUSY_IN_CONSULTATION` when the expert already has an open one
 * - `CONSULTATION_NOT_AVAILABLE` / `CLIENT_NOT_FOUND` for lookup failures
 */
@Injectable()
export class InitiateConsultationUsecase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly checkChatEligibility: CheckChatEligibilityUsecase,
    private readonly checkVoiceEligibility: CheckVoiceEligibilityUsecase,
    private readonly rooms: ConsultationRoomRepository,
  ) {}

  /**
   * Initiate a consultation request for the given mode.
   *
   * @param clientId - Requesting client account id.
   * @param expertId - Target expert id.
   * @param mode - Requested mode (`chat` or `voice`).
   * @param consultationId - Optional open consultation to attach a fresh session to.
   * @returns Ids only: `{ consultationId, sessionId, maxMinutes }`.
   * @throws PriceNotFoundError, InsufficientBalanceError, ExpertUnavailableError,
   *   ActiveConsultationExistsError, ExpertBusyInConsultationError,
   *   ConsultationNotAvailableError, ClientNotFoundError.
   */
  async execute(
    clientId: number,
    expertId: number,
    mode: ConsultationModeType,
    consultationId?: number,
  ): Promise<InitiateConsultationResult> {
    const modeEnum = toConsultationModeEnum(mode);

    const [client] = await this.db
      .select({ id: clientAccounts.id })
      .from(clientAccounts)
      .where(eq(clientAccounts.id, clientId))
      .limit(1);

    if (!client) throw new ClientNotFoundError();

    // Mode-specific eligibility + availability read outside the tx;
    // session guards stay inside.
    let pricePerMinute: number;
    let isEligibleForFree: boolean;
    let freeMinutes: number;
    let minBalanceRequired: number;

    if (mode === "chat") {
      const eligibility = await this.checkChatEligibility.execute(
        client.id,
        expertId,
      );
      if (!eligibility.expertIsAvailable) {
        throw new ExpertUnavailableError();
      }
      pricePerMinute = eligibility.chatPrice;
      isEligibleForFree = eligibility.isEligibleForFree;
      freeMinutes = eligibility.freeMinutes;
      minBalanceRequired = eligibility.minBalanceRequired;
    } else {
      // voice
      const eligibility = await this.checkVoiceEligibility.execute(
        client.id,
        expertId,
      );
      if (!eligibility.expertIsAvailable) {
        throw new ExpertUnavailableError();
      }
      pricePerMinute = eligibility.voicePrice;
      isEligibleForFree = eligibility.isEligibleForFree;
      freeMinutes = eligibility.freeMinutes;
      minBalanceRequired = eligibility.minBalanceRequired;
    }

    const quote: PricingQuote = {
      pricePerMinute,
      isEligibleForFree,
      freeMinutes,
      minBalanceRequired,
    };

    if (consultationId != null) {
      return this.attachSession(
        client.id,
        expertId,
        consultationId,
        quote,
        modeEnum,
      );
    }
    return this.createConsultation(client.id, expertId, quote, modeEnum);
  }

  /** Attach a fresh session to an existing open consultation. */
  private async attachSession(
    clientId: number,
    expertId: number,
    consultationId: number,
    quote: PricingQuote,
    mode: ConsultationMode,
  ): Promise<InitiateConsultationResult> {
    const { consultationId: id, sessionId } = await this.db.transaction(
      async (tx) => {
        const [consultation] = await tx
          .select()
          .from(consultations)
          .where(eq(consultations.id, consultationId))
          .limit(1);
        if (!consultation || consultation.client_id !== clientId) {
          throw new ConsultationNotAvailableError(
            consultationId,
            "Consultation not found.",
          );
        }
        if (consultation.status === ConsultationStatus.CLOSED) {
          throw new ConsultationNotAvailableError(
            consultationId,
            "Consultation is closed.",
          );
        }
        if (consultation.expert_id !== expertId) {
          throw new ConsultationNotAvailableError(
            consultationId,
            "Consultation belongs to another expert.",
          );
        }
        // Continuing a completed consultation may switch modes (e.g. "continue
        // via chat" on a voice thread): the root mode re-points to the
        // requested mode, mirroring SwitchToChatUseCase's mid-call flip.
        // Anything else keeps the strict same-mode rule.
        const modeFlip =
          consultation.mode !== mode &&
          consultation.status === ConsultationStatus.COMPLETED;
        if (consultation.mode !== mode && !modeFlip) {
          throw new ConsultationNotAvailableError(
            consultationId,
            `Consultation is not a ${mode} consultation.`,
          );
        }
        // A completed consultation may be continued later: attaching a new
        // session to it is allowed (re-open via `RequestConsultationUseCase`).

        const [other] = await tx
          .select()
          .from(consultations)
          .where(
            and(
              eq(consultations.client_id, clientId),
              eq(consultations.mode, mode),
              inArray(consultations.status, OPEN_STATUSES),
              ne(consultations.id, consultationId),
            ),
          )
          .limit(1);

        if (other) {
          throw new ActiveConsultationExistsError(other);
        }

        if (modeFlip) {
          await tx
            .update(consultations)
            .set({ mode, updated_at: new Date() })
            .where(eq(consultations.id, consultation.id));
        }

        const [session] = await tx
          .insert(consultationSessions)
          .values({
            consultation_id: consultation.id,
            mode,
            status: ConsultationSessionStatus.PENDING,
          })
          .returning({ id: consultationSessions.id });

        return { consultationId: consultation.id, sessionId: session.id };
      },
    );

    await this.rooms.armRoom(id, sessionId);

    // Display math only — no hold on reconnect (already held at creation).
    const balance = await this.readBalance(clientId);
    const snap = await this.rooms.getBudget(id);

    let maxMinutes: number;

    if (snap) {
      maxMinutes = effectiveMaxMinutes(snap, balance, quote.pricePerMinute);
    } else {
      maxMinutes = this.maxMinutes(balance, quote);
      await this.rooms.setBudget(id, {
        maxMinutes,
        balanceAtSnap: balance,
        freeBasis: quote.isEligibleForFree ? 1 : 0,
      });
    }

    return {
      consultationId: id,
      sessionId,
      maxMinutes,
      requestExpiresInSec: this.chatRequestTtlSeconds(),
    };
  }

  /** Create a new consultation plus its first session. */
  private async createConsultation(
    clientId: number,
    expertId: number,
    quote: PricingQuote,
    mode: ConsultationMode,
  ): Promise<InitiateConsultationResult> {
    const { isEligibleForFree, minBalanceRequired } = quote;

    const consultation = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.client_id, clientId),
            eq(consultations.mode, mode),
            inArray(consultations.status, OPEN_STATUSES),
          ),
        )
        .limit(1);

      if (existing) {
        throw new ActiveConsultationExistsError(existing);
      }

      const [expertBusy] = await tx
        .select({ id: consultations.id, status: consultations.status })
        .from(consultations)
        .where(
          and(
            eq(consultations.expert_id, expertId),
            eq(consultations.mode, mode),
            inArray(consultations.status, OPEN_STATUSES),
          ),
        )
        .limit(1);

      if (expertBusy) {
        throw new ExpertBusyInConsultationError(expertBusy.status);
      }

      // Fresh in-tx read: the check and the HOLD must see the same balance.
      const [wallet] = await tx
        .select()
        .from(clientWallets)
        .where(eq(clientWallets.client_id, clientId))
        .limit(1);
      const balance = wallet ? Number(wallet.balance) : 0;
      const maxMinutes = this.maxMinutes(balance, quote);

      if (!isEligibleForFree) {
        if (!wallet || balance < minBalanceRequired) {
          throw new InsufficientBalanceError();
        }
      }

      const [saved] = await tx
        .insert(consultations)
        .values({
          client_id: clientId,
          expert_id: expertId,
          mode,
          status: ConsultationStatus.REQUESTED,
        })
        .returning({ id: consultations.id });

      const [session] = await tx
        .insert(consultationSessions)
        .values({
          consultation_id: saved.id,
          mode,
          status: ConsultationSessionStatus.PENDING,
        })
        .returning({ id: consultationSessions.id });

      if (!isEligibleForFree && wallet) {
        const balanceBefore = Number(wallet.balance);
        const balanceAfter = balanceBefore - minBalanceRequired;
        await tx
          .update(clientWallets)
          .set({
            balance: String(balanceAfter),
            reserved_balance: String(
              Number(wallet.reserved_balance) + minBalanceRequired,
            ),
            updated_at: new Date(),
          })
          .where(eq(clientWallets.id, wallet.id));

        await tx.insert(clientTransactions).values({
          wallet_id: wallet.id,
          amount: String(minBalanceRequired),
          balance_before: String(balanceBefore),
          balance_after: String(balanceAfter),
          type: ClientTransactionType.HOLD,
          purpose: ClientTransactionPurpose.CONSULTATION,
          reference_id: `consultation_${saved.id}`,
          transaction_no: randomUUIDv7(),
        });
      }

      return {
        consultationId: saved.id,
        sessionId: session.id,
        maxMinutes,
        balanceAtSnap: isEligibleForFree
          ? balance
          : balance - minBalanceRequired,
        requestExpiresInSec: this.chatRequestTtlSeconds(),
      };
    });

    await this.rooms.armRoom(
      consultation.consultationId,
      consultation.sessionId,
    );
    await this.rooms.setBudget(consultation.consultationId, {
      maxMinutes: consultation.maxMinutes,
      balanceAtSnap: consultation.balanceAtSnap,
      freeBasis: isEligibleForFree ? 1 : 0,
    });

    const { balanceAtSnap, ...response } = consultation;
    void balanceAtSnap;
    return response;
  }

  private maxMinutes(balance: number, quote: PricingQuote): number {
    if (quote.isEligibleForFree || quote.pricePerMinute <= 0) {
      return quote.isEligibleForFree ? quote.freeMinutes : 0;
    }
    return Math.floor(balance / quote.pricePerMinute);
  }

  /** Display-only balance read. Never use for the HOLD — that re-reads in-tx. */
  private async readBalance(clientId: number): Promise<number> {
    const [wallet] = await this.db
      .select({ balance: clientWallets.balance })
      .from(clientWallets)
      .where(eq(clientWallets.client_id, clientId))
      .limit(1);
    return wallet ? Number(wallet.balance) : 0;
  }

  private chatRequestTtlSeconds(): number {
    return 120;
  }
}
