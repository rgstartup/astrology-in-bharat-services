import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
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
  StartConsultationCommand,
  toConsultationModeEnum,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Starts active billable time and session channels across chat, voice, and video.
 *
 * Responsibilities:
 * - Activate pending `consultation_sessions` row and set `started_at` in DB.
 * - Transition consultation status from `ACCEPTED` to `ACTIVE`.
 * - Record currently active metered mode and clear any stale pause key in Redis.
 * - Dispatch session initialization to the target mode adapter (`ChatModeAdapter`, `VoiceModeAdapter`, `VideoModeAdapter`).
 * - Calculate live affordability and broadcast `consultation:started` event.
 */
@Injectable()
export class StartConsultationUseCase {
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
   * Executes the session start workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId and participant actor info.
   * @returns Object containing started status, consultationId, and state payload.
   * @throws NotFoundException If the consultation does not exist.
   */
  async execute(server: Server, command: StartConsultationCommand) {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new NotFoundException('Consultation not found');

    const mode = toConsultationModeType(row.mode);
    const now = new Date();

    const [pendingSession] = await this.db
      .select()
      .from(consultationSessions)
      .where(
        and(
          eq(consultationSessions.consultation_id, row.id),
          eq(consultationSessions.status, ConsultationSessionStatus.PENDING),
        ),
      )
      .orderBy(desc(consultationSessions.id))
      .limit(1);

    let activeSession = pendingSession;
    if (pendingSession && !pendingSession.started_at) {
      const [updated] = await this.db
        .update(consultationSessions)
        .set({
          status: ConsultationSessionStatus.ACTIVE,
          started_at: now,
          updated_at: now,
        })
        .where(eq(consultationSessions.id, pendingSession.id))
        .returning();
      activeSession = updated;
    }

    if (row.status === ConsultationStatus.ACCEPTED) {
      await this.db
        .update(consultations)
        .set({
          status: ConsultationStatus.ACTIVE,
          started_at: now,
          updated_at: now,
        })
        .where(eq(consultations.id, row.id));
    }

    await this.rooms.setActiveMode(row.id, toConsultationModeEnum(mode));
    await this.rooms.clearPaused(row.id);

    await this.getAdapter(mode).onStart(row.id, activeSession ?? {});

    const affordability = await this.budget.calculateAffordability(row.id, mode);

    const payload: ConsultationStatePayload = {
      consultationId: row.id,
      mode,
      state: 'active',
      startedAt: affordability?.startedAt ?? now.toISOString(),
      elapsedSeconds: affordability?.elapsedSeconds ?? 0,
      maxMinutes: affordability?.maxMinutes ?? 0,
      ratePerMinute: affordability?.ratePerMinute ?? 0,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.STARTED, payload);

    return { status: 'started', consultationId: row.id, payload };
  }
}
