import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { IPaymentIntentHandler } from '@/internal/finance/payments/interfaces/payment-intent-handler.interface';
import { GatewayIntent } from '@/internal/finance/payments/enums/gateway-intent.enum';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { PaymentIntentDispatcher } from '@/internal/finance/payments/services/payment-intent-dispatcher.service';
import { OrderService } from '@/internal/commerce/order/order.service';

@Injectable()
export class ProductPurchaseIntentHandler
  implements IPaymentIntentHandler, OnModuleInit
{
  readonly intent = GatewayIntent.PRODUCT_PURCHASE;
  private readonly logger = new Logger(ProductPurchaseIntentHandler.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly dispatcher: PaymentIntentDispatcher,
  ) {}

  onModuleInit() {
    this.dispatcher.registerHandler(this);
  }

  async handleOrderCreated(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void> {
    const internalOrderId =
      transaction.reference_id ||
      (transaction.metadata as Record<string, any>)?.orderId ||
      (transaction.metadata as Record<string, any>)?.order_id;

    if (!internalOrderId || !transaction.gateway_order_id) {
      return;
    }

    this.logger.log(
      `Linking razorpay order ${transaction.gateway_order_id} to internal product order ${internalOrderId}`,
    );

    await this.orderService.setRazorpayOrderId(
      Number(internalOrderId),
      transaction.gateway_order_id,
      qr,
    );
  }

  async handleSuccess(
    transaction: GatewayTransaction,
    qr: QueryRunner,
  ): Promise<void> {
    const orderIdentifier =
      transaction.gateway_order_id || transaction.reference_id;

    if (!orderIdentifier) {
      throw new Error(
        `Cannot fulfill product order: missing order reference on transaction ${transaction.id}`,
      );
    }

    this.logger.log(`Fulfilling product purchase for order ${orderIdentifier}`);

    await this.orderService.markAsPaid(orderIdentifier, qr);
  }
}
