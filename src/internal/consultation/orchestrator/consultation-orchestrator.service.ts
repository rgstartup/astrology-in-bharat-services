import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import {
  ConsultationRoomRepository,
  chatPauseTtlMs,
} from '../room/consultation-room.repository';
import { ConsultationBudgetEngine } from './consultation-budget.engine';
import {
  AcceptConsultationUseCase,
  CancelConsultationUseCase,
  CloseConsultationUseCase,
  EndConsultationUseCase,
  GetConsultationStatusUseCase,
  PauseConsultationUseCase,
  RejectConsultationUseCase,
  RequestConsultationUseCase,
  ResumeConsultationUseCase,
  StartConsultationUseCase,
  SwitchToChatUseCase,
  TriggerBudgetHoldUseCase,
} from './use-cases';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { isConsultationParticipant } from '@/internal/realtime/room/consultation-room-access';
import type { AuthenticatedSocketIdentity } from '@/internal/realtime/types/socket-auth.types';
import type { RealtimeSocket } from '@/internal/realtime/types/socket-data.types';
import {
  AcceptConsultationCommand,
  CancelConsultationCommand,
  CloseConsultationCommand,
  ConsultationBudgetWarningPayload,
  ConsultationEndedPayload,
  ConsultationMediaReadyPayload,
  ConsultationModeType,
  ConsultationStatePayload,
  EndConsultationCommand,
  PauseConsultationCommand,
  RejectConsultationCommand,
  RequestConsultationCommand,
  ResumeConsultationCommand,
  StartConsultationCommand,
  SwitchToChatCommand,
  toConsultationModeType,
} from './consultation-orchestrator.types';

@Injectable()
export class ConsultationOrchestratorService {
  private readonly logger = new Logger(ConsultationOrchestratorService.name);
  private readonly budgetTimers = new Map<number, NodeJS.Timeout>();
  private readonly warningTimers = new Map<number, NodeJS.Timeout>();
  private readonly graceTimers = new Map<number, NodeJS.Timeout>();
  private readonly holdTimers = new Map<number, NodeJS.Timeout>();
  private bootRearmed = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly acceptUseCase: AcceptConsultationUseCase,
    private readonly rejectUseCase: RejectConsultationUseCase,
    private readonly requestUseCase: RequestConsultationUseCase,
    private readonly cancelUseCase: CancelConsultationUseCase,
    private readonly startUseCase: StartConsultationUseCase,
    private readonly pauseUseCase: PauseConsultationUseCase,
    private readonly resumeUseCase: ResumeConsultationUseCase,
    private readonly endUseCase: EndConsultationUseCase,
    private readonly statusUseCase: GetConsultationStatusUseCase,
    private readonly budgetHoldUseCase: TriggerBudgetHoldUseCase,
    private readonly switchToChatUseCase: SwitchToChatUseCase,
    private readonly closeUseCase: CloseConsultationUseCase,
    private readonly budget: ConsultationBudgetEngine,
  ) {}

  async accept(server: Server, command: AcceptConsultationCommand) {
    return this.acceptUseCase.execute(server, command);
  }

  async request(server: Server, command: RequestConsultationCommand) {
    return this.requestUseCase.execute(server, command);
  }

  async cancel(server: Server, command: CancelConsultationCommand) {
    return this.cancelUseCase.execute(server, command);
  }

  async reject(server: Server, command: RejectConsultationCommand) {
    return this.rejectUseCase.execute(server, command);
  }

  async close(server: Server, command: CloseConsultationCommand) {
    return this.closeUseCase.execute(server, command);
  }

  async start(server: Server, command: StartConsultationCommand) {
    const result = await this.startUseCase.execute(server, command);
    if (result.payload.state === 'active') {
      this.armBudgetTimer(server, command.consultationId, result.payload.mode);
    }
    return result;
  }

  /**
   * Records one side's Agora readiness for the pre-flight lobby handshake.
   *
   * Media readiness is the billing gate: the second report proves that both
   * parties are actually connected, so the metered session only starts then.
   * A party waiting alone in the lobby is never charged. Broadcasts
   * `consultation:media_ready` with participant flags so frontend clients can
   * initiate their transition countdown.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param consultationId - ID of the consultation going live on media.
   * @param identity - Reporting side (`client` | `expert`; must participate).
   * @param _socket - Optional socket reference (retained for backward compatibility).
   * @returns Readiness payload, or null when the reporter is not a participant.
   */
  async mediaReady(
    server: Server,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
    _socket?: RealtimeSocket,
  ): Promise<ConsultationMediaReadyPayload | null> {
    if (!(await isConsultationParticipant(this.db, consultationId, identity))) {
      return null;
    }
    const readiness = await this.rooms.markMediaReady(
      consultationId,
      identity.actorType,
    );
    const payload: ConsultationMediaReadyPayload = {
      consultationId,
      actorType: identity.actorType,
      actorId: identity.id,
      clientReady: readiness.clientReady,
      expertReady: readiness.expertReady,
      bothReady: readiness.bothReady,
      timestamp: new Date().toISOString(),
    };
    server
      .to(SOCKET_ROOMS.CONSULTATION(consultationId))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.MEDIA_READY, payload);
    if (readiness.bothReady) {
      await this.startWhenBothConnected(server, consultationId, identity);
    }
    return payload;
  }

  /**
   * Starts the metered session once both parties are connected on media.
   *
   * The start is idempotent, so a repeated readiness report cannot restart
   * the billing clock, and a consultation that is no longer `accepted` (it
   * already ran or was closed) is left untouched.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param consultationId - Consultation that is going live.
   * @param identity - Side that reported readiness.
   */
  private async startWhenBothConnected(
    server: Server,
    consultationId: number,
    identity: AuthenticatedSocketIdentity,
  ): Promise<void> {
    const status = await this.consultationStatus(consultationId);
    if (status !== ConsultationStatus.ACCEPTED) return;
    await this.start(server, {
      consultationId,
      actorId:
        identity.actorType === 'expert' ? identity.expertId : identity.id,
      actorType: identity.actorType === 'expert' ? 'expert' : 'client',
    });
  }

  /**
   * Reads the current lifecycle status of a consultation.
   *
   * @param consultationId - Consultation to look up.
   * @returns Current status, or null when the consultation does not exist.
   */
  private async consultationStatus(
    consultationId: number,
  ): Promise<ConsultationStatus | null> {
    const [row] = await this.db
      .select({ status: consultations.status })
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);
    return row?.status ?? null;
  }

  async pause(
    server: Server,
    command: PauseConsultationCommand,
  ): Promise<ConsultationStatePayload | null> {
    this.cancelBudgetTimer(command.consultationId);
    this.cancelHoldTimer(command.consultationId);
    const payload = await this.pauseUseCase.execute(server, command);
    if (payload && command.reason === 'billing_hold') {
      this.armHoldExpiry(server, command.consultationId);
    }
    return payload;
  }

  async resume(
    server: Server,
    command: ResumeConsultationCommand,
  ): Promise<ConsultationStatePayload> {
    this.cancelGraceTimer(command.consultationId);
    const result = await this.resumeUseCase.execute(server, command);
    this.armBudgetTimer(server, command.consultationId, result.mode);
    return result;
  }

  async end(
    server: Server | null | undefined,
    command: EndConsultationCommand,
  ): Promise<ConsultationEndedPayload> {
    this.cancelBudgetTimer(command.consultationId);
    this.cancelGraceTimer(command.consultationId);
    return this.endUseCase.execute(server, command);
  }

  async getStatus(
    consultationId: number,
  ): Promise<ConsultationStatePayload | null> {
    return this.statusUseCase.execute(consultationId);
  }

  /**
   * Moves a live voice/video consultation over to chat. The metered rate
   * follows the new mode, so the budget timer is re-armed for chat.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing the consultation id and the acting client.
   * @returns Switch result with the new chat session id and the state payload.
   */
  async switchToChat(server: Server, command: SwitchToChatCommand) {
    this.cancelBudgetTimer(command.consultationId);
    const result = await this.switchToChatUseCase.execute(server, command);
    if (result.payload.state === 'active') {
      this.armBudgetTimer(server, command.consultationId, 'chat');
    }
    return result;
  }

  async triggerBudgetHold(
    server: Server,
    consultationId: number,
    graceDelayMs?: number,
  ) {
    this.cancelBudgetTimer(consultationId);
    this.cancelHoldTimer(consultationId);
    const hold = await this.budgetHoldUseCase.execute(server, consultationId);
    if (hold) {
      this.armGraceTimer(
        server,
        consultationId,
        graceDelayMs ?? hold.graceDurationSeconds * 1000,
      );
    }
  }

  /**
   * Boot recovery: re-arm in-memory budget/warning/grace timers lost on
   * restart. Called once from the gateway `afterInit` (socket server is not
   * available during module init). Redis keys (pause, anchors, request TTL)
   * and the request-expiry cron survive restarts, so only ACTIVE rows need
   * re-arming: unpaused rows get a fresh affordability pass (auto-hold when
   * exhausted), paused-but-broke rows resume the hold with the remaining
   * paused-key TTL as grace, and paused-with-budget rows stay paused until
   * resume. Per-row failures are logged and skipped.
   */
  async onServerReady(server: Server): Promise<void> {
    if (this.bootRearmed) return;
    this.bootRearmed = true;

    const rows = await this.db
      .select({ id: consultations.id, mode: consultations.mode })
      .from(consultations)
      .where(eq(consultations.status, ConsultationStatus.ACTIVE))
      .limit(500);

    let rearmed = 0;
    let holds = 0;
    let skipped = 0;
    for (const row of rows) {
      try {
        const outcome = await this.rearmOne(server, row.id, row.mode);
        if (outcome === 'hold') holds += 1;
        else if (outcome === 'rearmed') rearmed += 1;
        else skipped += 1;
      } catch (err) {
        this.logger.warn(`[BootRearm] Skipping consultation ${row.id}: ${err}`);
        skipped += 1;
      }
    }
    this.logger.log(
      `[BootRearm] Re-armed ${rearmed}, resumed ${holds} holds, skipped ${skipped} of ${rows.length} active consultations`,
    );
  }

  private async rearmOne(
    server: Server,
    consultationId: number,
    storedMode: string,
  ): Promise<'rearmed' | 'hold' | 'skipped'> {
    const mode = toConsultationModeType(storedMode);
    const live = await this.budget.calculateAffordability(consultationId, mode);
    if (!live) return 'skipped';

    if (await this.rooms.isBillingHeld(consultationId)) {
      // Dialog hold survived a restart: let the remaining hold TTL lapse, then
      // release it and re-arm billing (or fall into the budget hold).
      const ttlMs = await this.rooms.billingHoldTtlMs(consultationId);
      this.armHoldExpiry(server, consultationId, ttlMs ?? undefined);
      return 'skipped';
    }

    if (await this.rooms.isPaused(consultationId)) {
      // Paused + broke = interrupted budget hold: re-hold with the leftover
      // paused-key TTL as grace. Paused + funded = manual pause (or a hold
      // the client already recharged through) — leave it for resume.
      if (live.remainingSeconds > 0) return 'skipped';
      const graceDelayMs = await this.rooms.pausedTtlMs(consultationId);
      await this.triggerBudgetHold(
        server,
        consultationId,
        graceDelayMs ?? undefined,
      );
      return 'hold';
    }

    this.armBudgetTimer(server, consultationId, mode);
    return 'rearmed';
  }

  armBudgetTimer(
    server: Server,
    consultationId: number,
    mode: ConsultationModeType,
  ) {
    this.cancelBudgetTimer(consultationId);
    void this.budget
      .calculateAffordability(consultationId, mode)
      .then((live) => {
        if (!live || live.remainingSeconds <= 0) {
          void this.triggerBudgetHold(server, consultationId);
          return;
        }

        // 60-second advance warning before exhaustion if remaining time allows
        const warningThresholdSec = 60;
        if (live.remainingSeconds > warningThresholdSec) {
          const warningDelayMs =
            (live.remainingSeconds - warningThresholdSec) * 1000;
          const warningTimer = setTimeout(
            () => {
              this.warningTimers.delete(consultationId);
              const warningPayload: ConsultationBudgetWarningPayload = {
                consultationId,
                mode,
                remainingSeconds: warningThresholdSec,
                message: '1 minute remaining in consultation.',
                timestamp: new Date().toISOString(),
              };
              server
                .to(SOCKET_ROOMS.CONSULTATION(consultationId))
                .emit(
                  SOCKET_EVENTS.CONSULTATION.BUDGET.WARNING,
                  warningPayload,
                );
            },
            Math.min(warningDelayMs, 2_147_483_647),
          );
          this.warningTimers.set(consultationId, warningTimer);
        }

        const delayMs = Math.max(1000, live.remainingSeconds * 1000);
        const timer = setTimeout(
          () => {
            void this.triggerBudgetHold(server, consultationId);
          },
          Math.min(delayMs, 2_147_483_647),
        );
        this.budgetTimers.set(consultationId, timer);
      });
  }

  cancelBudgetTimer(consultationId: number) {
    const timer = this.budgetTimers.get(consultationId);
    if (timer) {
      clearTimeout(timer);
      this.budgetTimers.delete(consultationId);
    }
    const warningTimer = this.warningTimers.get(consultationId);
    if (warningTimer) {
      clearTimeout(warningTimer);
      this.warningTimers.delete(consultationId);
    }
  }

  private armGraceTimer(
    server: Server,
    consultationId: number,
    delayMs: number,
  ) {
    this.cancelGraceTimer(consultationId);
    const timer = setTimeout(() => {
      this.graceTimers.delete(consultationId);
      void this.end(server, {
        consultationId,
        actorId: 0,
        actorType: 'system',
        reason: 'balance_exhausted_timeout',
      });
    }, delayMs);
    this.graceTimers.set(consultationId, timer);
  }

  private cancelGraceTimer(consultationId: number) {
    const timer = this.graceTimers.get(consultationId);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(consultationId);
    }
  }

  /**
   * Releases a dialog-driven billing hold when its safety TTL lapses (the
   * client left the confirmation open). Resuming re-anchors the clock and
   * re-arms the budget timer; a broke client falls into the normal hold.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param consultationId - Consultation whose hold should be released.
   * @param delayMs - Optional remaining hold window (boot recovery).
   */
  private armHoldExpiry(
    server: Server,
    consultationId: number,
    delayMs?: number,
  ) {
    this.cancelHoldTimer(consultationId);
    const timer = setTimeout(() => {
      this.holdTimers.delete(consultationId);
      void this.releaseExpiredHold(server, consultationId);
    }, delayMs ?? chatPauseTtlMs());
    this.holdTimers.set(consultationId, timer);
  }

  private async releaseExpiredHold(
    server: Server,
    consultationId: number,
  ): Promise<void> {
    try {
      if (!(await this.rooms.isBillingHeld(consultationId))) return;
      await this.resume(server, {
        consultationId,
        actorId: 0,
        actorType: 'system',
      });
    } catch (err) {
      this.logger.warn(
        `[BillingHold] Could not release hold on ${consultationId}: ${err}`,
      );
      await this.triggerBudgetHold(server, consultationId).catch(
        () => undefined,
      );
    }
  }

  private cancelHoldTimer(consultationId: number) {
    const timer = this.holdTimers.get(consultationId);
    if (timer) {
      clearTimeout(timer);
      this.holdTimers.delete(consultationId);
    }
  }
}
