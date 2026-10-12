import { Injectable, Logger } from '@nestjs/common';
import type { IConsultationModeAdapter } from './consultation-mode.adapter';
import type { ConsultationModeType } from '../consultation-orchestrator.types';

@Injectable()
export class ChatModeAdapter implements IConsultationModeAdapter {
  readonly mode: ConsultationModeType = 'chat';
  private readonly logger = new Logger(ChatModeAdapter.name);

  async onStart(consultationId: number, session: Record<string, any>): Promise<void> {
    this.logger.debug(`[ChatModeAdapter] Started chat for consultation ${consultationId}`);
  }

  async onPause(consultationId: number): Promise<void> {
    this.logger.debug(`[ChatModeAdapter] Paused chat for consultation ${consultationId}`);
  }

  async onResume(consultationId: number): Promise<void> {
    this.logger.debug(`[ChatModeAdapter] Resumed chat for consultation ${consultationId}`);
  }

  async onEnd(consultationId: number): Promise<void> {
    this.logger.debug(`[ChatModeAdapter] Ended chat for consultation ${consultationId}`);
  }
}
