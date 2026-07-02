import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { ExpertStatusChangedEvent } from '../../domain/events/profile-events';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class ExpertStatusChangedHandler {
  private readonly logger = new Logger(ExpertStatusChangedHandler.name);

  constructor(private readonly expertGateway: ExpertGateway) {}

  @OnEvent('expert.status.changed', { async: true })
  handle(event: ExpertStatusChangedEvent) {
    this.logger.log(
      `Expert ${event.userId} status changed to ${event.isAvailable ? 'online' : 'offline'}`,
    );
    this.expertGateway.notifyStatusChange(event.userId, event.isAvailable);
  }
}
