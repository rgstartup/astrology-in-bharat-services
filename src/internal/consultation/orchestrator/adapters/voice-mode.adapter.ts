import { Injectable, Logger } from '@nestjs/common';
import { ConsultationMode } from '@/internal/consultation/enums';
import { ConsultationRoomRepository } from '@/internal/consultation/room/consultation-room.repository';
import type {
  ConsultationResumeContext,
  IConsultationModeAdapter,
} from './consultation-mode.adapter';
import type { ConsultationModeType } from '../consultation-orchestrator.types';

/**
 * Voice channel adapter for the consultation orchestrator.
 *
 * Mirrors the chat lifecycle in Redis with AUDIO_CALL as the metered mode.
 * Media-plane hooks (room hold/unhold) land here when voice leaves stub.
 */
@Injectable()
export class VoiceModeAdapter implements IConsultationModeAdapter {
  readonly mode: ConsultationModeType = 'voice';
  private readonly logger = new Logger(VoiceModeAdapter.name);

  /**
   * Creates the voice channel adapter.
   *
   * @param rooms - Redis repository owning pause/anchor/budget/mode keys.
   */
  constructor(private readonly rooms: ConsultationRoomRepository) {}

  /**
   * Marks AUDIO_CALL as the active metered mode and drops any stale pause gate.
   *
   * @param consultationId - ID of the consultation being started.
   * @param session - Active session row (unused; kept for interface parity).
   */
  async onStart(consultationId: number, session: Record<string, any>): Promise<void> {
    void session;
    await this.rooms.setActiveMode(consultationId, ConsultationMode.AUDIO_CALL);
    await this.rooms.clearPaused(consultationId);
    this.logger.debug(`[VoiceModeAdapter] Started voice session for consultation ${consultationId}`);
  }

  /**
   * Sets the Redis pause gate freezing billable time.
   *
   * @param consultationId - ID of the consultation being paused.
   */
  async onPause(consultationId: number): Promise<void> {
    await this.rooms.pauseRoom(consultationId);
    this.logger.debug(`[VoiceModeAdapter] Paused voice session for consultation ${consultationId}`);
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
    this.logger.debug(`[VoiceModeAdapter] Resumed voice session for consultation ${consultationId}`);
  }

  /**
   * Flushes voice channel keys (pause, anchor, budget snapshot, active mode,
   * media readiness).
   *
   * @param consultationId - ID of the consultation being ended.
   */
  async onEnd(consultationId: number): Promise<void> {
    await this.rooms.clearPaused(consultationId);
    await this.rooms.clearAnchor(consultationId);
    await this.rooms.clearBudget(consultationId);
    await this.rooms.clearActiveMode(consultationId);
    await this.rooms.clearMediaReady(consultationId);
    this.logger.debug(`[VoiceModeAdapter] Ended voice session for consultation ${consultationId}`);
  }
}
