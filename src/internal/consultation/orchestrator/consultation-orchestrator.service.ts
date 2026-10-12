import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { ConsultationBudgetEngine } from './consultation-budget.engine';
import {
  AcceptConsultationUseCase,
  EndConsultationUseCase,
  GetConsultationStatusUseCase,
  PauseConsultationUseCase,
  RejectConsultationUseCase,
  ResumeConsultationUseCase,
  StartConsultationUseCase,
  TriggerBudgetHoldUseCase,
} from './use-cases';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import {
  AcceptConsultationCommand,
  ConsultationBudgetWarningPayload,
  ConsultationEndedPayload,
  ConsultationModeType,
  ConsultationStatePayload,
  EndConsultationCommand,
  PauseConsultationCommand,
  RejectConsultationCommand,
  ResumeConsultationCommand,
  StartConsultationCommand,
} from './consultation-orchestrator.types';

@Injectable()
export class ConsultationOrchestratorService {
  private readonly logger = new Logger(ConsultationOrchestratorService.name);
  private readonly budgetTimers = new Map<number, NodeJS.Timeout>();
  private readonly warningTimers = new Map<number, NodeJS.Timeout>();
  private readonly graceTimers = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly acceptUseCase: AcceptConsultationUseCase,
    private readonly rejectUseCase: RejectConsultationUseCase,
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
  ): Promise<ConsultationStatePayload> {
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

  async triggerBudgetHold(server: Server, consultationId: number) {
    this.cancelBudgetTimer(consultationId);
    const hold = await this.budgetHoldUseCase.execute(server, consultationId);
    if (hold) {
      this.armGraceTimer(server, consultationId, hold.graceDurationSeconds * 1000);
    }
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
