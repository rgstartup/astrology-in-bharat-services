import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
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
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { ChatModeAdapter } from '../adapters/chat-mode.adapter';
import { VoiceModeAdapter } from '../adapters/voice-mode.adapter';
import { VideoModeAdapter } from '../adapters/video-mode.adapter';
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
 * - Set expert presence back to `IDLE` via `PresenceService`.
 * - Clean up mode adapter resources (`onEnd`).
 * - Flush Redis pause, anchor, and active mode state keys.
 * - Broadcast `consultation:ended` payload to participants.
 */
@Injectable()
export class EndConsultationUseCase {
  private readonly adapters: Map<ConsultationModeType, IConsultationModeAdapter>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
    private readonly presence: PresenceService,
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

    await this.db
      .update(consultations)
      .set({
        status: ConsultationStatus.COMPLETED,
        ended_at: now,
        updated_at: now,
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

    await this.db
      .update(consultationSessions)
      .set({
        status: ConsultationSessionStatus.COMPLETED,
        ended_at: now,
        updated_at: now,
      })
      .where(
        and(
          eq(consultationSessions.consultation_id, command.consultationId),
          eq(consultationSessions.status, ConsultationSessionStatus.ACTIVE),
        ),
      );

    await this.presence.setIdle(row.expert_id);

    await this.getAdapter(mode).onEnd(row.id);
    await this.rooms.clearPaused(row.id);
    await this.rooms.clearAnchor(row.id);
    await this.rooms.clearBudget(row.id);
    await this.rooms.clearActiveMode(row.id);

    const payload: ConsultationEndedPayload = {
      consultationId: row.id,
      mode,
      endedBy: String(command.actorId),
      reason: command.reason ?? 'manual',
      totalDurationSeconds: row.duration_seconds,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, payload);
    server
      .to(SOCKET_ROOMS.CHAT_SESSION(row.id))
      .emit(SOCKET_EVENTS.CHAT.ENDED, payload);
    server
      .to(SOCKET_ROOMS.CALL_SESSION(row.id))
      .emit(SOCKET_EVENTS.CALL.END, payload);

    return payload;
  }
}
