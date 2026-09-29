import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  type IPaymentGateway,
  PAYMENT_GATEWAY,
  WebhookValidationRequest,
} from '../../../../external/payment/payment-gateway.interface';
import { GatewayTransaction } from '../entities/gateway-transaction.entity';
import { GatewayTransactionStatus } from '../enums/gateway-transaction-status.enum';
import { VerifyPaymentUseCase } from './verify-payment.use-case';

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @InjectRepository(GatewayTransaction)
    private readonly gatewayTxRepo: Repository<GatewayTransaction>,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
  ) {}

  async execute(request: WebhookValidationRequest) {
    const event = this.paymentGateway.parseWebhook(request);
    this.logger.log(
      `[${this.paymentGateway.providerName.toUpperCase()}_WEBHOOK] Parsed event: ${event.eventType} for order: ${event.providerOrderId}`,
    );

    if (event.eventType === 'payment.success') {
      if (!event.providerOrderId || !event.providerPaymentId) {
        this.logger.warn(
          'Webhook payload missing providerOrderId or providerPaymentId',
        );
        return { received: true };
      }

      // Check if already processed
      const existingTx = await this.gatewayTxRepo.findOne({
        where: { gateway_order_id: event.providerOrderId },
      });

      if (
        !existingTx ||
        existingTx.status !== GatewayTransactionStatus.SUCCESS
      ) {
        await this.verifyPaymentUseCase.execute({
          razorpay_order_id: event.providerOrderId,
          razorpay_payment_id: event.providerPaymentId,
          razorpay_signature: '', // Trusted since webhook signature is verified by guard
        });
      }
    } else if (event.eventType === 'payment.failed') {
      if (event.providerOrderId) {
        await this.gatewayTxRepo.update(
          { gateway_order_id: event.providerOrderId },
          {
            status: GatewayTransactionStatus.FAILED,
            failure_reason: event.failureReason || 'Payment failed',
          },
        );
      }
    }

    return { received: true };
  }
}
