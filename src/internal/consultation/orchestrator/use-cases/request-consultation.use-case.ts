import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultationSessions, consultations } from '@/core/drizzledb/schema';
import {
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import {
  RequestConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Handles a client requesting a consultation with an expert.
 *
 * Responsibilities:
 * - Verify consultation is in REQUESTED status and owned by the client.
 * - Refresh `requested_at` so the expiry cron window restarts on every (re-)request.
 * - Arm request expiry timer via ConsultationRoomRepository.
 * - Broadcast incoming request to expert and consultation rooms.
 */
@Injectable()
export class RequestConsultationUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly budget: ConsultationBudgetEngine,
  ) {}

  /**
   * Executes the request consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, client actorId, and expertId.
   * @returns Object containing confirmation status and consultationId.
   * @throws NotFoundException If consultation does not exist.
   * @throws BadRequestException If consultation is not in REQUESTED status or not owned by client.
   */
  async execute(server: Server, command: RequestConsultationCommand) {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(
        eq(consultations.id, command.consultationId),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Consultation not found');

    if (row.client_id !== command.actorId) {
      throw new BadRequestException('Only the client can request this consultation');
    }

    // A completed consultation can be continued later: a re-request re-opens
    // it as REOPENED so the expert gets the incoming event again. An already
    // REOPENED consultation keeps its status (re-request just re-arms the TTL).
    const reopen = row.status === ConsultationStatus.COMPLETED;
    const continuable =
      row.status === ConsultationStatus.REQUESTED ||
      row.status === ConsultationStatus.REOPENED ||
      reopen;
    if (!continuable) {
      throw new BadRequestException('Consultation cannot be requested');
    }

    // Re-anchor the request window: the expiry cron measures from
    // `requested_at`, so each (re-)request restarts the expert's TTL.
    const now = new Date();
    await this.db
      .update(consultations)
      .set({
        requested_at: now,
        updated_at: now,
        ...(reopen ? { status: ConsultationStatus.REOPENED } : {}),
      })
      .where(eq(consultations.id, row.id));

    const mode = toConsultationModeType(row.mode);

    // Arm request expiry timer
    await this.rooms.armRequestExpiry(row.id);

    // Calculate initial affordability for the expert preview
    const affordability = await this.budget.calculateAffordability(row.id, mode);

    // The expert app navigates to `/dashboard/consultations/${sessionId}` on accept,
    // so the incoming card needs the pending session id (pre-migration
    // `requestChat` sent `sessionId: session?.id ?? null`).
    const [pendingSession] = await this.db
      .select({ id: consultationSessions.id })
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.consultation_id, row.id),
          eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
        ),
      )
      .orderBy(desc(consultationSessions.id))
      .limit(1);

    const payload = {
      consultationId: row.id,
      clientId: row.client_id,
      expertId: row.expert_id,
      mode,
      sessionId: pendingSession?.id ?? null,
      maxMinutes: affordability?.maxMinutes ?? 0,
      ratePerMinute: affordability?.ratePerMinute ?? 0,
      startedAt: affordability?.startedAt ?? null,
      timestamp: new Date().toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.INCOMING, payload);
    server
      .to(SOCKET_ROOMS.EXPERT(row.expert_id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.INCOMING, payload);

    return { status: 'requested', consultationId: row.id };
  }
}