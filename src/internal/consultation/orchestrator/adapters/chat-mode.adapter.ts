import { Injectable, Logger } from '@nestjs/common';
import { ConsultationMode } from '@/internal/consultation/enums';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import type {
  ConsultationResumeContext,
  IConsultationModeAdapter,
} from './consultation-mode.adapter';
import type { ConsultationModeType } from '../consultation-orchestrator.types';

/**
 * Chat channel adapter for the consultation orchestrator.
 *
 * Owns the chat channel's Redis lifecycle: records CHAT as the metered
 * mode on start, sets the pause gate on pause, re-anchors the billing
 * clock on resume, and flushes channel keys on end.
 */
@Injectable()
export class ChatModeAdapter implements IConsultationModeAdapter {
  readonly mode: ConsultationModeType = 'chat';
  private readonly logger = new Logger(ChatModeAdapter.name);

  /**
   * Creates the chat channel adapter.
   *
   * @param rooms - Redis repository owning pause/anchor/budget/mode keys.
   */
  constructor(private readonly rooms: ConsultationRoomRepository) {}

  /**
   * Marks CHAT as the active metered mode and drops any stale pause gate.
   *
   * @param consultationId - ID of the consultation being started.
   * @param session - Active session row (unused; kept for interface parity).
   */
  async onStart(consultationId: number, session: Record<string, any>): Promise<void> {
    void session;
    await this.rooms.setActiveMode(consultationId, ConsultationMode.CHAT);
    await this.rooms.clearPaused(consultationId);
    this.logger.debug(`[ChatModeAdapter] Started chat for consultation ${consultationId}`);
  }

  /**
   * Sets the Redis pause gate freezing live messaging.
   *
   * @param consultationId - ID of the consultation being paused.
   */
  async onPause(consultationId: number): Promise<void> {
    await this.rooms.pauseRoom(consultationId);
    this.logger.debug(`[ChatModeAdapter] Paused chat for consultation ${consultationId}`);
  }

  /**
   * Re-anchors the billing clock carrying consumed seconds forward and
   * clears the pause gate.
   *
   * @param consultationId - ID of the consultation being resumed.
   * @param context - Billing re-anchor (fresh timestamp + consumed base seconds).
   */
  async onResume(consultationId: number, context: ConsultationResumeContext): Promise<void> {
    await this.rooms.setAnchor(consultationId, context.anchorIso, context.baseSeconds);
    await this.rooms.clearPaused(consultationId);
    this.logger.debug(`[ChatModeAdapter] Resumed chat for consultation ${consultationId}`);
  }

  /**
   * Flushes chat channel keys (pause, anchor, budget snapshot, active mode).
   *
   * @param consultationId - ID of the consultation being ended.
   */
  async onEnd(consultationId: number): Promise<void> {
    await this.rooms.clearPaused(consultationId);
    await this.rooms.clearAnchor(consultationId);
    await this.rooms.clearBudget(consultationId);
    await this.rooms.clearActiveMode(consultationId);
    this.logger.debug(`[ChatModeAdapter] Ended chat for consultation ${consultationId}`);
  }
}
