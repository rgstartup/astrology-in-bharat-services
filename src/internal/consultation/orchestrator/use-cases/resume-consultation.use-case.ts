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
import { ConsultationBudgetEngine } from '../consultation-budget.engine';
import { ChatModeAdapter } from '../adapters/chat-mode.adapter';
import { VoiceModeAdapter } from '../adapters/voice-mode.adapter';
import { VideoModeAdapter } from '../adapters/video-mode.adapter';
import {
  ConsultationModeType,
  ConsultationStatePayload,
  IConsultationModeAdapter,
  ResumeConsultationCommand,
  toConsultationModeType,
} from '../consultation-orchestrator.types';

/**
 * Resumes a paused consultation after client recharge or manual resume.
 *
 * Responsibilities:
 * - Validate that client wallet holds sufficient balance for continuation ($\ge \text{ratePerMinute}$).
 * - Delegate resume to the target mode adapter (`onResume`): re-anchor the
 *   billing clock carrying base consumed seconds forward and clear the pause key.
 * - Broadcast `consultation:resumed` and `consultation:budget:restored` events.
 */
@Injectable()
export class ResumeConsultationUseCase {
  private readonly adapters: Map<ConsultationModeType, IConsultationModeAdapter>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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
   * Executes the resume consultation workflow.
   *
   * @param server - Authoritative Socket.IO server instance.
   * @param command - Command containing consultationId and participant actor info.
   * @returns Updated consultation state payload reflecting active status.
   * @throws NotFoundException If consultation does not exist.
   * @throws BadRequestException If client wallet does not have sufficient balance.
   */
  async execute(
    server: Server,
    command: ResumeConsultationCommand,
  ): Promise<ConsultationStatePayload> {
    const [row] = await this.db
      .select()
      .from(consultations)
      .where(eq(consultations.id, command.consultationId))
      .limit(1);

    if (!row) throw new NotFoundException('Consultation not found');

    const mode = toConsultationModeType(row.mode);
    const affordability = await this.budget.calculateAffordability(row.id, mode);

    if (!affordability || affordability.remainingSeconds <= 0) {
      throw new BadRequestException('Insufficient balance to resume consultation');
    }

    const now = new Date();
    const startedAt = now.toISOString();

    await this.getAdapter(mode).onResume(row.id, {
      anchorIso: startedAt,
      baseSeconds: affordability.elapsedSeconds,
    });

    const payload: ConsultationStatePayload = {
      consultationId: row.id,
      mode,
      state: 'active',
      startedAt,
      elapsedSeconds: affordability.elapsedSeconds,
      maxMinutes: affordability.maxMinutes,
      ratePerMinute: affordability.ratePerMinute,
      timestamp: now.toISOString(),
    };

    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED, payload);
    server
      .to(SOCKET_ROOMS.CONSULTATION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.RESTORED, payload);
    server
      .to(SOCKET_ROOMS.CHAT_SESSION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED, payload);
    server
      .to(SOCKET_ROOMS.CHAT_SESSION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.BUDGET.RESTORED, payload);
    server
      .to(SOCKET_ROOMS.CALL_SESSION(row.id))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.RESUMED, payload);

    return payload;
  }
}
