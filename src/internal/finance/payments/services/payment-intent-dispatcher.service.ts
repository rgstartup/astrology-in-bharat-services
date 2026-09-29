import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { GatewayIntent } from '@/internal/finance/payments/enums/gateway-intent.enum';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { IPaymentIntentHandler } from '@/internal/finance/payments/interfaces/payment-intent-handler.interface';

@Injectable()
export class PaymentIntentDispatcher {
  private readonly logger = new Logger(PaymentIntentDispatcher.name);
  private readonly handlers = new Map<GatewayIntent, IPaymentIntentHandler>();

  registerHandler(handler: IPaymentIntentHandler) {
    this.logger.log(`Registered payment intent handler for: ${handler.intent}`);
    this.handlers.set(handler.intent, handler);
  }

  async dispatchOrderCreated(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void> {
    const handler = this.handlers.get(transaction.intent);

    if (handler && handler.handleOrderCreated) {
      await handler.handleOrderCreated(transaction, qr);
    }
  }

  async dispatchSuccess(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void> {
    const handler = this.handlers.get(transaction.intent);

    if (!handler) {
      this.logger.warn(
        `No payment intent handler registered for intent: ${transaction.intent}`,
      );
      return;
    }

    await handler.handleSuccess(transaction, qr);
  }

  async dispatchFailure(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void> {
    const handler = this.handlers.get(transaction.intent);

    if (handler && handler.handleFailure) {
      await handler.handleFailure(transaction, qr);
    }
  }
}
