import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { ConsultationRoomRepository } from '../room/consultation-room.repository';
import { ConsultationBudgetEngine } from './consultation-budget.engine';
import {
  AcceptConsultationUseCase,
  CancelConsultationUseCase,
  EndConsultationUseCase,
  GetConsultationStatusUseCase,
  PauseConsultationUseCase,
  RejectConsultationUseCase,
  RequestConsultationUseCase,
  ResumeConsultationUseCase,
  StartConsultationUseCase,
  TriggerBudgetHoldUseCase,
} from './use-cases';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  AcceptConsultationCommand,
  CancelConsultationCommand,
  ConsultationBudgetWarningPayload,
  ConsultationEndedPayload,
  ConsultationModeType,
  ConsultationStatePayload,
  EndConsultationCommand,
  PauseConsultationCommand,
  RejectConsultationCommand,
  RequestConsultationCommand,
  ResumeConsultationCommand,
  StartConsultationCommand,
  toConsultationModeType,
} from './consultation-orchestrator.types';

@Injectable()
export class ConsultationOrchestratorService {
  private readonly logger = new Logger(ConsultationOrchestratorService.name);
  private readonly budgetTimers = new Map<number, NodeJS.Timeout>();
  private readonly warningTimers = new Map<number, NodeJS.Timeout>();
  private readonly graceTimers = new Map<number, NodeJS.Timeout>();
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

  async start(server: Server, command: StartConsultationCommand) {
    const result = await this.startUseCase.execute(server, command);
    this.armBudgetTimer(server, command.consultationId, result.payload.mode);
    return result;
  }

  async pause(
    server: Server,
    command: PauseConsultationCommand,
  ): Promise<ConsultationStatePayload | null> {
    this.cancelBudgetTimer(command.consultationId);
    return this.pauseUseCase.execute(server, command);
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
    server: Server,
    command: EndConsultationCommand,
  ): Promise<ConsultationEndedPayload> {
    this.cancelBudgetTimer(command.consultationId);
    this.cancelGraceTimer(command.consultationId);
    return this.endUseCase.execute(server, command);
  }

  async getStatus(consultationId: number): Promise<ConsultationStatePayload | null> {
    return this.statusUseCase.execute(consultationId);
  }

  async triggerBudgetHold(server: Server, consultationId: number, graceDelayMs?: number) {
    this.cancelBudgetTimer(consultationId);
    const hold = await this.budgetHoldUseCase.execute(server, consultationId);
    if (hold) {
      this.armGraceTimer(server, consultationId, graceDelayMs ?? hold.graceDurationSeconds * 1000);
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
    void this.budget.calculateAffordability(consultationId, mode).then((live) => {
      if (!live || live.remainingSeconds <= 0) {
        void this.triggerBudgetHold(server, consultationId);
        return;
      }

      // 60-second advance warning before exhaustion if remaining time allows
      const warningThresholdSec = 60;
      if (live.remainingSeconds > warningThresholdSec) {
        const warningDelayMs = (live.remainingSeconds - warningThresholdSec) * 1000;
        const warningTimer = setTimeout(() => {
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
            .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.WARNING, warningPayload);
          server
            .to(SOCKET_ROOMS.CHAT_SESSION(consultationId))
            .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.WARNING, warningPayload);
        }, Math.min(warningDelayMs, 2_147_483_647));
        this.warningTimers.set(consultationId, warningTimer);
      }

      const delayMs = Math.max(1000, live.remainingSeconds * 1000);
      const timer = setTimeout(() => {
        void this.triggerBudgetHold(server, consultationId);
      }, Math.min(delayMs, 2_147_483_647));
      this.budgetTimers.set(consultationId, timer);
    });
  }

  private cancelBudgetTimer(consultationId: number) {
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
}
