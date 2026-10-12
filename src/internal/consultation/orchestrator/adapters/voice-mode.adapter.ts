import { Injectable, Logger } from '@nestjs/common';
import type { IConsultationModeAdapter } from './consultation-mode.adapter';
import type { ConsultationModeType } from '../consultation-orchestrator.types';

@Injectable()
export class VoiceModeAdapter implements IConsultationModeAdapter {
  readonly mode: ConsultationModeType = 'voice';
  private readonly logger = new Logger(VoiceModeAdapter.name);

  async onStart(consultationId: number, session: Record<string, any>): Promise<void> {
    this.logger.debug(`[VoiceModeAdapter] Started voice session for consultation ${consultationId}`);
  }

  async onPause(consultationId: number): Promise<void> {
    this.logger.debug(`[VoiceModeAdapter] Paused voice session for consultation ${consultationId}`);
  }

  async onResume(consultationId: number): Promise<void> {
    this.logger.debug(`[VoiceModeAdapter] Resumed voice session for consultation ${consultationId}`);
  }

  async onEnd(consultationId: number): Promise<void> {
    this.logger.debug(`[VoiceModeAdapter] Ended voice session for consultation ${consultationId}`);
  }
}
