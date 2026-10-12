import { Injectable, Logger } from '@nestjs/common';
import type { IConsultationModeAdapter } from './consultation-mode.adapter';
import type { ConsultationModeType } from '../consultation-orchestrator.types';

@Injectable()
export class VideoModeAdapter implements IConsultationModeAdapter {
  readonly mode: ConsultationModeType = 'video';
  private readonly logger = new Logger(VideoModeAdapter.name);

  async onStart(consultationId: number, session: Record<string, any>): Promise<void> {
    this.logger.debug(`[VideoModeAdapter] Started video session for consultation ${consultationId}`);
  }

  async onPause(consultationId: number): Promise<void> {
    this.logger.debug(`[VideoModeAdapter] Paused video session for consultation ${consultationId}`);
  }

  async onResume(consultationId: number): Promise<void> {
    this.logger.debug(`[VideoModeAdapter] Resumed video session for consultation ${consultationId}`);
  }

  async onEnd(consultationId: number): Promise<void> {
    this.logger.debug(`[VideoModeAdapter] Ended video session for consultation ${consultationId}`);
  }
}
