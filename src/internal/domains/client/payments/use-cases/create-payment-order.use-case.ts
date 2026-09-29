import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type IPaymentGateway,
  PAYMENT_GATEWAY,
} from '@/external/payment/payment-gateway.interface';
import { PaymentOrder, PaymentStatus } from '@/internal/finance/payments/entities/payment-order.entity';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import {
  GatewayIntent,
  GatewayName,
  GatewayTransactionStatus,
} from '@/internal/finance/payments/enums';
import { RazorpayConfig } from '@/config/razorpay.config';
import { DatabaseService } from '@/core/database/database.service';
import { DomainError } from '@/shared/types/domain.error';
import { PaymentOrderCreationFailedError } from '@/internal/finance/payments/domain/errors/payment.errors';
import { PaymentIntentDispatcher } from '@/internal/finance/payments/services/payment-intent-dispatcher.service';
import { ClientAccount } from '@/internal/domains/client/account/entities/account.entity';
import { CreateOrderDto } from '../dto/create-order.dto';

@Injectable()
export class CreatePaymentOrderUseCase {
  private readonly logger = new Logger(CreatePaymentOrderUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly dispatcher: PaymentIntentDispatcher,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async execute(client: ClientAccount, dto: CreateOrderDto) {
    const clientId = client.id;
    const userId = client.user?.id;

    this.logger.log(
      `Creating payment order for client ${clientId} (user ${userId}) with data:`,
      JSON.stringify(dto, null, 2),
    );

    try {
      const { amount, notes, type } = dto;

      const intent =
        (notes?.intent as GatewayIntent) ||
        (type === 'product'
          ? GatewayIntent.PRODUCT_PURCHASE
          : type === 'booking'
            ? GatewayIntent.BOOKING
            : GatewayIntent.WALLET_RECHARGE);

      const options = {
        amount: amount * 100, // razorpay expects in paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          clientId: clientId.toString(),
          userId: userId ? userId.toString() : '',
          type,
          intent,
          ...notes,
        },
      };

      const order = await this.paymentGateway.createOrder({
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        notes: options.notes,
      });

      const notesRecord = (notes || {}) as Record<string, unknown>;
      const internalOrderId = (notesRecord.orderId || notesRecord.order_id) as
        string | undefined;

      await this.db.transaction(async (queryRunner) => {
        const paymentOrder = queryRunner.manager.create(PaymentOrder, {
          client_id: clientId,
          razorpay_order_id: order.providerOrderId,
          amount,
          notes: options.notes,
          status: PaymentStatus.PENDING,
        });
        await queryRunner.manager.save(PaymentOrder, paymentOrder);

        const gatewayTx = queryRunner.manager.create(GatewayTransaction, {
          gateway_name: GatewayName.RAZORPAY,
          client_id: clientId,
          amount,
          currency: 'INR',
          status: GatewayTransactionStatus.PENDING,
          intent,
          gateway_order_id: order.providerOrderId,
          reference_id:
            internalOrderId || (client.public_id ? client.public_id : clientId.toString()),
          reference_type: type || 'wallet_recharge',
          metadata: options.notes,
        });
        await queryRunner.manager.save(GatewayTransaction, gatewayTx);

        // Delegate domain-specific post-order-creation tasks via intent dispatcher
        await this.dispatcher.dispatchOrderCreated(gatewayTx, queryRunner);
      });

      return {
        id: order.providerOrderId,
        amount: order.amount,
        currency: order.currency,
        key_id: this.configService.get<RazorpayConfig>('razorpay')?.keyId || '',
      };
    } catch (error) {
      this.logger.error('Error creating payment order', (error as Error).stack);
      if (error instanceof DomainError) {
        throw error;
      }
      throw new PaymentOrderCreationFailedError();
    }
  }
}
