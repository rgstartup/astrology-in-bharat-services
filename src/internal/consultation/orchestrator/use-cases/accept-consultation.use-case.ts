import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { PresenceService } from '@/internal/actors/expert/presence/presence.service';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import {
  AcceptConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Handles accepting a requested consultation booking.
 *
 * Responsibilities:
 * - Transition consultation status from `REQUESTED` to `ACCEPTED` in DB.
 * - Set expert presence to `BUSY` via `PresenceService`.
 * - Calculate initial affordability and max available minutes via `ConsultationBudgetEngine`.
 * - Broadcast acceptance events to consultation and chat socket rooms.
 */
@Injectable()
export class AcceptConsultationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly budget: ConsultationBudgetEngine,
    private readonly presence: PresenceService,
  ) {}

  /**
   * Executes the accept consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, expert actorId, and role.
   * @returns Object containing confirmation status and consultationId.
   * @throws BadRequestException If consultation is not in REQUESTED status or not owned by expert.
   */
  async execute(server: Server, command: AcceptConsultationCommand) {
    const [consultation] = await this.db
      .update(consultations)
      .set({
        status: ConsultationStatus.ACCEPTED,
        accepted_at: new Date(),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(consultations.id, command.consultationId),
          eq(consultations.expert_id, command.actorId),
          eq(consultations.status, ConsultationStatus.REQUESTED),
        ),
      )
      .returning();

    if (!consultation) {
      throw new BadRequestException('Consultation cannot be accepted');
    }

    const mode = toConsultationModeType(consultation.mode);

    // Mark expert busy
    await this.presence.setBusy(consultation.expert_id, consultation.id);

    const affordability = await this.budget.calculateAffordability(
      consultation.id,
      mode,
    );

    const payload = {
      consultationId: consultation.id,
      expertId: consultation.expert_id,
      mode,
      maxMinutes: affordability?.maxMinutes ?? 0,
      startedAt: affordability?.startedAt ?? null,
      timestamp: new Date().toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(consultation.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ACCEPTED, payload);
    server
      .to(SOCKET_ROOMS.CHAT_SESSION(consultation.id))
      .emit(SOCKET_EVENTS.CHAT.ACCEPTED, payload);

    return { status: 'accepted', consultationId: consultation.id };
  }
}
