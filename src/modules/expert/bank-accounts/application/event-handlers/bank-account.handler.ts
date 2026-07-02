import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import {
  BankAccountCreatedEvent,
  PrimaryBankAccountChangedEvent,
} from '../../domain/events/bank-account-events';

@Injectable()
export class BankAccountEventHandler {
  private readonly logger = new Logger(BankAccountEventHandler.name);

  @OnEvent('expert.bank-account.created', { async: true })
  handleCreated(event: BankAccountCreatedEvent) {
    this.logger.log(
      `Bank account ${event.accountId} created for expert ${event.userId} (Holder: ${event.accountHolderName})`,
    );
  }

  @OnEvent('expert.bank-account.primary-changed', { async: true })
  handlePrimaryChanged(event: PrimaryBankAccountChangedEvent) {
    this.logger.log(
      `Primary bank account for expert ${event.userId} changed from ${event.oldAccountId} to ${event.newAccountId}`,
    );
  }
}
