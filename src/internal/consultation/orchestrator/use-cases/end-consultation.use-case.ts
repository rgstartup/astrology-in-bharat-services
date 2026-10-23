import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultationSessions,
  consultations,
} from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { PresenceService } from '@/internal/actors/expert/presence/presence.service';
import { releaseConsultationHold } from '@/internal/actors/client/wallet/release-consultation-hold';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ChatModeAdapter } from '../adapters/chat-mode.adapter';
import { VoiceModeAdapter } from '../adapters/voice-mode.adapter';
import { VideoModeAdapter } from '../adapters/video-mode.adapter';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import {
  ConsultationEndedPayload,
  ConsultationModeType,
  EndConsultationCommand,
  IConsultationModeAdapter,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Finalizes and terminates an active or accepted consultation.
 *
 * Responsibilities:
 * - Update consultation status to `COMPLETED` and record `ended_at` in DB.
 * - Complete active `consultation_sessions` row.
 * - Refund the wallet hold when the consultation never started.
 * - Set expert presence back to `IDLE` via `PresenceService`.
 * - Delegate teardown to the target mode adapter (`onEnd`): flush Redis
 *   pause, anchor, budget, and active-mode keys plus mode-specific cleanup.
 * - Broadcast `consultation:ended` payload to participants.
 */
@Injectable()
export class EndConsultationUseCase {
  private readonly adapters: Map<ConsultationModeType, IConsultationModeAdapter>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presence: PresenceService,
    private readonly budget: ConsultationBudgetEngine,
    chatAdapter: ChatModeAdapter,
    voiceAdapter: VoiceModeAdapter,
    videoAdapter: VideoModeAdapter,
  ) {
    this.adapters = new Map<ConsultationModeType, IConsultationModeAdapter>([
      ['chat', chatAdapter],
      ['voice', voiceAdapter],
      ['video', videoAdapter],
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
    server: Server,
    command: EndConsultationCommand,
  ): Promise<ConsultationEndedPayload> {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new NotFoundException('Consultation not found');

    const mode = toConsultationModeType(row.mode);
    const now = new Date();
    const neverStarted = !row.started_at;

    const affordability = await this.budget.calculateAffordability(row.id, mode);
    const durationSeconds = neverStarted
      ? 0
      : (affordability?.elapsedSeconds ?? row.duration_seconds);

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
              eq(consultationSessions.ended_reason, 'paused'),
            ),
          )
          .orderBy(desc(consultationSessions.id))
          .limit(1);
        const [lastSession] = await tx
          .select({ id: consultationSessions.id })
          .from(consultationSessions)
          .where(eq(consultationSessions.consultation_id, command.consultationId))
          .orderBy(desc(consultationSessions.id))
          .limit(1);
        if (lastPaused && lastSession && lastPaused.id === lastSession.id) {
          await tx
            .update(consultationSessions)
            .set({ ended_reason: null, updated_at: now })
            .where(eq(consultationSessions.id, lastPaused.id));
        }
      }

      if (neverStarted) {
        await releaseConsultationHold(tx, row.client_id, row.id);
      }
    });

    await this.presence.setIdle(row.expert_id);

    await this.getAdapter(mode).onEnd(row.id);

    const payload: ConsultationEndedPayload = {
      consultationId: row.id,
      mode,
      endedBy: String(command.actorId),
      reason: command.reason ?? 'manual',
      totalDurationSeconds: durationSeconds,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, payload);

    return payload;
  }
}
