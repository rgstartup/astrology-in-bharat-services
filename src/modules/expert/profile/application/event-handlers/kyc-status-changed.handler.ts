import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { KycStatusChangedEvent } from '../../domain/events/profile-events';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class KycStatusChangedHandler {
  private readonly logger = new Logger(KycStatusChangedHandler.name);

  constructor(private readonly expertGateway: ExpertGateway) {}

  @OnEvent('expert.kyc.status-changed', { async: true })
  async handle(event: KycStatusChangedEvent) {
    this.logger.log(
      `KYC status changed to "${event.status}" for expert ${event.userId}`,
    );
    this.expertGateway.notifyKycStatusUpdate(event.userId, event.status, event.reason);
  }
}
