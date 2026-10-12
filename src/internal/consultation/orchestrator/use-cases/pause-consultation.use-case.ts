import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Server } from 'socket.io';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { SOCKET_EVENTS } from '@/internal/realtime/constants/socket-events.constant';
import { SOCKET_ROOMS } from '@/internal/realtime/constants/socket-rooms.constant';
import { ConsultationRoomRepository } from '../../room/consultation-room.repository';
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import { ChatModeAdapter } from '../adapters/chat-mode.adapter';
import { VoiceModeAdapter } from '../adapters/voice-mode.adapter';
import { VideoModeAdapter } from '../adapters/video-mode.adapter';
import {
  ConsultationModeType,
  ConsultationStatePayload,
  IConsultationModeAdapter,
  PauseConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Pauses an active consultation (manual pause or system budget exhaustion).
 *
 * Responsibilities:
 * - Set Redis pause key to freeze live messaging and signaling passes.
 * - Delegate pause actions to target mode adapter (`onPause`).
 * - Calculate elapsed billable duration up to this pause point.
 * - Broadcast `consultation:paused` event to both participants.
 */
@Injectable()
export class PauseConsultationUseCase {
  private readonly adapters: Map<ConsultationModeType, IConsultationModeAdapter>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly rooms: ConsultationRoomRepository,
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
   * Executes the pause consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId, actor info, and reason.
   * @returns Updated consultation state payload reflecting paused status.
   * @throws NotFoundException If consultation does not exist.
   */
  async execute(
    server: Server,
    command: PauseConsultationCommand,
  ): Promise<ConsultationStatePayload> {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new NotFoundException('Consultation not found');

    const mode = toConsultationModeType(row.mode);
    const affordability = await this.budget.calculateAffordability(row.id, mode);
    const now = new Date();

    await this.rooms.pauseRoom(row.id);
    await this.getAdapter(mode).onPause(row.id);

    const payload: ConsultationStatePayload = {
      consultationId: row.id,
      mode,
      state: 'paused',
      reason: command.reason ?? 'manual',
      startedAt: affordability?.startedAt ?? null,
      elapsedSeconds: affordability?.elapsedSeconds ?? 0,
      maxMinutes: affordability?.maxMinutes ?? 0,
      ratePerMinute: affordability?.ratePerMinute ?? 0,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.PAUSED, payload);
    server
      .to(SOCKET_ROOMS.CHAT_SESSION(row.id))
      .emit(SOCKET_EVENTS.CHAT.PAUSED, payload);
    server
      .to(SOCKET_ROOMS.CALL_SESSION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.PAUSED, payload);

    return payload;
  }
}
