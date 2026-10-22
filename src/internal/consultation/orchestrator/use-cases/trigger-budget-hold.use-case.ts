import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import { PauseConsultationUseCase } from './pause-consultation.use-case';
import {
  ConsultationBudgetHoldPayload,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Handles the 5-minute budget hold flow triggered when client wallet balance is exhausted.
 *
 * Responsibilities:
 * - Automatically pauses consultation billing via `PauseConsultationUseCase`.
 * - Computes a 300-second grace deadline (`Date.now() + 300_000`).
 * - Dispatches role-tailored `consultation:budget:exhausted` events:
 *   - Client receives prompt to recharge with minimum required amount.
 *   - Expert receives notification to wait with a 5-minute countdown clock.
 * - Returns deadline and duration info for orchestrator timer scheduling.
 */
@Injectable()
export class TriggerBudgetHoldUseCase {
  private readonly logger = new Logger(TriggerBudgetHoldUseCase.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly budget: ConsultationBudgetEngine,
    private readonly pauseUseCase: PauseConsultationUseCase,
  ) {}

  /**
   * Executes the budget hold trigger.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param consultationId - ID of the consultation whose budget was exhausted.
   * @returns Object with graceDeadline timestamp and graceDurationSeconds (300),
   *   or undefined when the consultation is missing or terminal (pause guard).
   */
  async execute(server: Server, consultationId: number) {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (!row) return;
    const mode = toConsultationModeType(row.mode);

    // Pause room first (no-op on terminal consultations, e.g. a hold racing
    // a completed end — never prompt recharge post-ended).
    const paused = await this.pauseUseCase.execute(server, {
      consultationId,
      actorId: 0,
      actorType: 'system',
      reason: 'insufficient_balance',
    });
    if (!paused) return;

    const graceDurationSeconds = 300;
    const graceDeadline = new Date(
      Date.now() + graceDurationSeconds * 1000,
    ).toISOString();

    const affordability = await this.budget.calculateAffordability(
      consultationId,
      mode,
    );

    const clientPayload: ConsultationBudgetHoldPayload = {
      consultationId,
      mode,
      state: 'budget_hold',
      reason: 'insufficient_balance',
      graceDeadline,
      graceDurationSeconds,
      rechargeRequired: true,
      minRechargeAmount: affordability?.ratePerMinute ?? 30,
      timestamp: new Date().toISOString(),
    };

    const expertPayload: ConsultationBudgetHoldPayload = {
      consultationId,
      mode,
      state: 'budget_hold',
      reason: 'insufficient_balance',
      graceDeadline,
      graceDurationSeconds,
      waitingForClient: true,
      timestamp: new Date().toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CLIENT(row.client_id))
      .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.EXHAUSTED, clientPayload);
    server
      .to(SOCKET_ROOMS.EXPERT(row.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.EXHAUSTED, expertPayload);
    server
      .to(SOCKET_ROOMS.CONSULTATION(consultationId))
      .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.EXHAUSTED, clientPayload);

    this.logger.log(
      `[BudgetHold] Triggered 5-minute budget hold for consultation ${consultationId} (deadline: ${graceDeadline})`,
    );

    return { graceDeadline, graceDurationSeconds };
  }
}
