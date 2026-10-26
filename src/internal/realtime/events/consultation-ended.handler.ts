import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CONSULTATION_ENDED_EVENT } from '@/internal/consultation/orchestrator/consultation-orchestrator.events';
import type { ConsultationEndedPayload } from '@/internal/consultation/orchestrator/consultation-orchestrator.types';
import { SOCKET_EVENTS } from '../constants/socket-events.constant';
import { SOCKET_ROOMS } from '../constants/socket-rooms.constant';
import { ConsultationGateway } from '../gateways/consultation.gateway';

/**
 * Handles internal domain `consultation.ended` events and translates them
 * into Socket.IO room broadcasts. Keeps `ConsultationGateway` clean from
 * application event-listening logic.
 */
@Injectable()
export class ConsultationEndedHandler {
  private readonly logger = new Logger(ConsultationEndedHandler.name);

  constructor(private readonly consultationGateway: ConsultationGateway) {}

  @OnEvent(CONSULTATION_ENDED_EVENT, { async: true })
  handle(payload: ConsultationEndedPayload): void {
    const server = this.consultationGateway.server;
    if (!server) {
      this.logger.warn(
        `[ConsultationEndedHandler] Cannot emit consultation:ended for #${payload.consultationId}: gateway server not initialized`,
      );
      return;
    }

    server
      .to(SOCKET_ROOMS.CONSULTATION(payload.consultationId))
      .emit(SOCKET_EVENTS.CONSULTATION.EVENTS.ENDED, payload);

    this.logger.log(
      `[ConsultationEndedHandler] Broadcasted consultation:ended for #${payload.consultationId} (reason: ${payload.reason})`,
    );
  }
}
