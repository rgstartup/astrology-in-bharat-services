import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { gatewayTransactions } from '@/core/drizzledb/schema';
import {
  type IPaymentGateway,
  PAYMENT_GATEWAY,
  StandardWebhookEvent,
  WebhookValidationRequest,
} from '@/external/payment/payment-gateway.interface';
import {
  GatewayTransactionStatus,
  GatewayIntent,
  GatewayName,
} from '../enums';
import { GatewayTransaction } from '../entities/gateway-transaction.entity';
import { PaymentOrder, PaymentStatus } from '../entities/payment-order.entity';
import { PaymentIntentDispatcher } from '../services/payment-intent-dispatcher.service';
import { DatabaseService } from '@/core/database/database.service';

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly drizzleDb: DrizzleDb,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly paymentIntentDispatcher: PaymentIntentDispatcher,
    private readonly db: DatabaseService,
  ) {}

  async execute(request: WebhookValidationRequest): Promise<{ received: boolean; ignored?: boolean }> {
    const event = this.paymentGateway.parseWebhook(request);
    this.logger.log(
      `[${this.paymentGateway.providerName.toUpperCase()}_WEBHOOK] Received event: ${event.eventType} for order: ${event.providerOrderId}`,
    );

    switch (event.eventType) {
      case 'payment.success':
        await this.handlePaymentSuccess(event);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(event);
        break;

      default:
        this.logger.log(
          `Unhandled webhook event type: ${event.eventType}. Skipping processing.`,
        );
        return { received: true, ignored: true };
    }

    return { received: true };
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private async handlePaymentSuccess(event: StandardWebhookEvent): Promise<void> {
    const { providerOrderId, providerPaymentId } = event;

    if (!providerOrderId || !providerPaymentId) {
      this.logger.warn('Payment success event missing orderId or paymentId');
      return;
    }

    // Fast-path idempotency check via Drizzle read
    const isAlreadySuccess = await this.isTransactionAlreadySuccess(providerOrderId);
    if (isAlreadySuccess) {
      this.logger.log(`Order ${providerOrderId} already processed as SUCCESS. Skipping.`);
      return;
    }

    // Process payment success inside transactional pessimistic lock
    await this.db.transaction(async (queryRunner) => {
      let gatewayTx = await queryRunner.manager.findOne(GatewayTransaction, {
        where: { gateway_order_id: providerOrderId },
        lock: { mode: 'pessimistic_write' },
      });

      const legacyOrder = await queryRunner.manager.findOne(PaymentOrder, {
        where: { razorpay_order_id: providerOrderId },
        lock: { mode: 'pessimistic_write' },
      });

      // Locked idempotency check
      if (
        (gatewayTx && gatewayTx.status === GatewayTransactionStatus.SUCCESS) ||
        (legacyOrder && legacyOrder.status === PaymentStatus.SUCCESS)
      ) {
        return;
      }

      // Legacy fallback: initialize gateway transaction if only legacy payment order existed
      if (!gatewayTx && legacyOrder) {
        const intent = this.resolveIntent(legacyOrder.notes, event.metadata);

        gatewayTx = queryRunner.manager.create(GatewayTransaction, {
          gateway_name: GatewayName.RAZORPAY,
          client_id: legacyOrder.client_id,
          amount: legacyOrder.amount,
          currency: 'INR',
          status: GatewayTransactionStatus.PENDING,
          intent,
          gateway_order_id: providerOrderId,
          reference_id: legacyOrder.client_id ? legacyOrder.client_id.toString() : null,
          metadata: legacyOrder.notes,
        });
      }

      if (gatewayTx) {
        gatewayTx.status = GatewayTransactionStatus.SUCCESS;
        gatewayTx.gateway_payment_id = providerPaymentId;
        await queryRunner.manager.save(GatewayTransaction, gatewayTx);
      }

      if (legacyOrder) {
        legacyOrder.status = PaymentStatus.SUCCESS;
        legacyOrder.razorpay_payment_id = providerPaymentId;
        await queryRunner.manager.save(PaymentOrder, legacyOrder);
      }

      // Dispatch success to corresponding domain handler
      if (gatewayTx) {
        await this.paymentIntentDispatcher.dispatchSuccess(gatewayTx, queryRunner);
      }
    });
  }

  private async handlePaymentFailed(event: StandardWebhookEvent): Promise<void> {
    const { providerOrderId, failureReason } = event;

    if (!providerOrderId) {
      this.logger.warn('Payment failed event missing providerOrderId');
      return;
    }

    this.logger.warn(
      `Marking transaction as FAILED for order ${providerOrderId}. Reason: ${failureReason || 'N/A'}`,
    );

    await this.drizzleDb
      .update(gatewayTransactions)
      .set({
        status: GatewayTransactionStatus.FAILED,
        failure_reason: failureReason || 'Payment failed',
        updated_at: new Date(),
      })
      .where(eq(gatewayTransactions.gateway_order_id, providerOrderId));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async isTransactionAlreadySuccess(orderId: string): Promise<boolean> {
    const [tx] = await this.drizzleDb
      .select({ status: gatewayTransactions.status })
      .from(gatewayTransactions)
      .where(eq(gatewayTransactions.gateway_order_id, orderId))
      .limit(1);

    return tx?.status === GatewayTransactionStatus.SUCCESS;
  }

  private resolveIntent(
    notes?: Record<string, any>,
    metadata?: Record<string, any>,
  ): GatewayIntent {
    const merged = { ...notes, ...metadata };

    if (merged.intent && Object.values(GatewayIntent).includes(merged.intent as GatewayIntent)) {
      return merged.intent as GatewayIntent;
    }

    switch (merged.type) {
      case 'product':
        return GatewayIntent.PRODUCT_PURCHASE;
      case 'booking':
        return GatewayIntent.BOOKING;
      case 'wallet_recharge':
      default:
        return GatewayIntent.WALLET_RECHARGE;
    }
  }
}
