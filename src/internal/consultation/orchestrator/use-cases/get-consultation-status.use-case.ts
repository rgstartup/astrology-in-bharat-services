import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import {
  ConsultationLifecycleState,
  ConsultationStatePayload,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Queries the authoritative current state of a consultation.
 *
 * Responsibilities:
 * - Read consultation and pricing mode data from database.
 * - Inspect Redis pause state to distinguish paused vs active states.
 * - Calculate live affordability (rate, elapsed seconds, maxMinutes, remainingSeconds).
 * - Return structured `ConsultationStatePayload` for connecting/reconnecting clients.
 */
@Injectable()
export class GetConsultationStatusUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly budget: ConsultationBudgetEngine,
  ) {}

  /**
   * Executes the consultation status query.
   *
   * @param consultationId - ID of the consultation.
   * @returns Current state payload or null if consultation not found.
   */
  async execute(consultationId: number): Promise<ConsultationStatePayload | null> {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1);

    if (!row) return null;

    const mode = toConsultationModeType(row.mode);
    const isPaused = await this.rooms.isPaused(consultationId);
    const affordability = await this.budget.calculateAffordability(consultationId, mode);

    return {
      consultationId,
      mode,
      state: isPaused ? 'paused' : (row.status as ConsultationLifecycleState),
      startedAt: affordability?.startedAt ?? null,
      elapsedSeconds: affordability?.elapsedSeconds ?? 0,
      remainingSeconds: affordability?.remainingSeconds ?? 0,
      maxMinutes: affordability?.maxMinutes ?? 0,
      ratePerMinute: affordability?.ratePerMinute ?? 0,
      timestamp: new Date().toISOString(),
    };
  }
}
