import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Server } from "socket.io";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb, DrizzleTx } from "@/core/drizzledb/drizzle.types";
import {
  consultationSessions,
  consultations,
  consultationBillings,
} from "@/core/drizzledb/schema";
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from "@/internal/consultation/enums";
import { PresenceService } from "@/internal/actors/expert/presence/presence.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  releaseConsultationHold,
  settleConsultationHold,
} from "@/internal/actors/client/wallet/release-consultation-hold";
import { PromotionsService } from "@/internal/promotions/promotions.service";
import { SOCKET_EVENTS } from "@/internal/realtime/constants/socket-events.constant";
import { SOCKET_ROOMS } from "@/internal/realtime/constants/socket-rooms.constant";
import { CONSULTATION_ENDED_EVENT } from "../consultation-orchestrator.events";
import { ChatModeAdapter } from "../adapters/chat-mode.adapter";
import { VoiceModeAdapter } from "../adapters/voice-mode.adapter";
import { VideoModeAdapter } from "../adapters/video-mode.adapter";
import { ConsultationBudgetEngine } from "../consultation-budget.engine";
import {
  ConsultationEndedPayload,
  ConsultationModeType,
  EndConsultationCommand,
  IConsultationModeAdapter,
  toConsultationModeType,
} from "../consultation-orchestrator.types";

/**
 * Finalizes and terminates an active or accepted consultation.
 *
 * Responsibilities:
 * - Update consultation status to `COMPLETED` and record `ended_at` in DB.
 * - Complete active `consultation_sessions` row.
 * - Refund the wallet hold when the consultation never started; settle it
 *   (promo consumption, billing row, wallet debit) when it did.
 * - Set expert presence back to `IDLE` via `PresenceService`.
 * - Delegate teardown to the target mode adapter (`onEnd`): flush Redis
 *   pause, anchor, budget, and active-mode keys plus mode-specific cleanup.
 * - Broadcast `consultation:ended` payload to participants.
 */
@Injectable()
export class EndConsultationUseCase {
  private readonly adapters: Map<
    ConsultationModeType,
    IConsultationModeAdapter
  >;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presence: PresenceService,
    private readonly budget: ConsultationBudgetEngine,
    private readonly promotions: PromotionsService,
    private readonly eventEmitter: EventEmitter2,
    chatAdapter: ChatModeAdapter,
    voiceAdapter: VoiceModeAdapter,
    videoAdapter: VideoModeAdapter,
  ) {
    this.adapters = new Map<ConsultationModeType, IConsultationModeAdapter>([
      ["chat", chatAdapter],
      ["voice", voiceAdapter],
      ["video", videoAdapter],
    ]);
  }

  private getAdapter(mode: ConsultationModeType): IConsultationModeAdapter {
    const adapter = this.adapters.get(mode);
    if (!adapter) throw new BadRequestException(`Unsupported mode: ${mode}`);
    return adapter;
  }

  /**
   * Executes the end consultation workflow.
   *
   * A consultation that never started (no session ever became active) is
   * cancelled instead of completed and the wallet hold taken at request time
   * is refunded: the client waited in the lobby and got no service.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, ending actor, and termination reason.
   * @returns Consultation ended payload with duration and reason.
   * @throws NotFoundException If consultation does not exist.
   */
  async execute(
    server: Server | null | undefined,
    command: EndConsultationCommand,
  ): Promise<ConsultationEndedPayload> {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new NotFoundException("Consultation not found");

    const mode = toConsultationModeType(row.mode);
    const now = new Date();
    const neverStarted = !row.started_at;

    const affordability = await this.budget.calculateAffordability(
      row.id,
      mode,
    );
    const durationSeconds = neverStarted
      ? 0
      : (affordability?.elapsedSeconds ?? row.duration_seconds);

    // Capture the latest session id so the ENDED payload carries sessionId,
    // letting frontend hooks distinguish session 1 from session 2 on continue.
    let lastSessionId: number | undefined;

    await this.db.transaction(async (tx) => {
      await tx
        .update(consultations)
        .set({
          status: neverStarted
            ? ConsultationStatus.CANCELLED
            : ConsultationStatus.COMPLETED,
          duration_seconds: durationSeconds,
          ended_at: now,
          updated_at: now,
          ...(neverStarted ? { cancelled_at: now } : {}),
        })
        .where(
          and(
            eq(consultations.id, command.consultationId),
            inArray(consultations.status, [
              ConsultationStatus.ACCEPTED,
              ConsultationStatus.ACTIVE,
            ]),
          ),
        );

      await tx
        .update(consultationSessions)
        .set({
          status: neverStarted
            ? ConsultationSessionStatus.CANCELLED
            : ConsultationSessionStatus.COMPLETED,
          ended_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(consultationSessions.consultation_id, command.consultationId),
            inArray(consultationSessions.status, [
              ConsultationSessionStatus.PENDING,
              ConsultationSessionStatus.ACTIVE,
            ]),
          ),
        );

      if (!neverStarted) {
        const [lastPaused] = await tx
          .select({ id: consultationSessions.id })
          .from(consultationSessions)
          .where(
            and(
              eq(consultationSessions.consultation_id, command.consultationId),
              eq(consultationSessions.ended_reason, "paused"),
            ),
          )
          .orderBy(desc(consultationSessions.id))
          .limit(1);
        const [lastSession] = await tx
          .select({ id: consultationSessions.id })
          .from(consultationSessions)
          .where(
            eq(consultationSessions.consultation_id, command.consultationId),
          )
          .orderBy(desc(consultationSessions.id))
          .limit(1);
        lastSessionId = lastSession?.id ?? undefined;
        if (lastPaused && lastSession && lastPaused.id === lastSession.id) {
          await tx
            .update(consultationSessions)
            .set({ ended_reason: null, updated_at: now })
            .where(eq(consultationSessions.id, lastPaused.id));
        }
      }

      if (neverStarted) {
        await releaseConsultationHold(tx, row.client_id, row.id);
      } else {
        // Settlement (v2 plan): burn actual promotional usage first, then
        // price the consultation and settle the wallet hold. Never runs for
        // an unstarted consultation — zero usage, release only.
        const promo = await this.promotions.consumePromotionalSeconds(
          row.client_id,
          row.id,
          durationSeconds,
          tx,
        );
        const rate = affordability?.ratePerMinute ?? 0;
        const round2 = (value: number) =>
          (Math.round(value * 100) / 100).toFixed(2);
        const gross = round2((durationSeconds / 60) * rate);
        const discount = round2((promo.consumedSeconds / 60) * rate);
        const payable = round2(Math.max(0, Number(gross) - Number(discount)));
        const settle = await settleConsultationHold(
          tx,
          row.client_id,
          row.id,
          Number(payable),
        );
        const settlement = {
          rate_per_minute: round2(rate),
          billable_seconds: durationSeconds,
          billable_minutes: round2(durationSeconds / 60),
          gross_earning: gross,
          promotional_discount: discount,
          payable_amount: payable,
          wallet_deduction: round2(settle.deduction),
          consumed_promotional_seconds: promo.consumedSeconds,
          promotion_benefit_id: promo.benefitId,
        };
        await tx
          .insert(consultationBillings)
          .values({ consultation_id: row.id, ...settlement })
          .onConflictDoUpdate({
            target: consultationBillings.consultation_id,
            set: settlement,
          });
      }
    });

    await this.presence.setIdle(row.expert_id);

    await this.getAdapter(mode).onEnd(row.id);

    const payload: ConsultationEndedPayload = {
      consultationId: row.id,
      sessionId: lastSessionId,
      mode,
      endedBy: String(command.actorId),
      reason: command.reason ?? "manual",
      totalDurationSeconds: durationSeconds,
      timestamp: now.toISOString(),
    };

    this.eventEmitter.emit(CONSULTATION_ENDED_EVENT, payload);

    if (server) {
      server
        .to(SOCKET_ROOMS.CONSULTATION(row.id))
        .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, payload);

      // Mirror ENDED to both personal rooms so each app hears the
      // termination even if its socket dropped the consultation-room
      // subscription (e.g. reconnect). Matches the STARTED/RESUMED pattern.
      server.to(SOCKET_ROOMS.CLIENT(row.client_id)).emit(
        SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED,
        payload,
      );
      server.to(SOCKET_ROOMS.EXPERT(row.expert_id)).emit(
        SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED,
        payload,
      );
    }

    return payload;
  }
}
