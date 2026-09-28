import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from '@/external/payment/payment-gateway.interface';
import { PaymentOrder, PaymentStatus } from '../entities/payment-order.entity';
import { GatewayTransaction } from '../entities/gateway-transaction.entity';
import { GatewayIntent, GatewayName, GatewayTransactionStatus } from '../enums';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderService } from '@/internal/commerce/order/order.service';
import { ConfigService } from '@nestjs/config';
import { RazorpayConfig } from '@/config/razorpay.config';
import { DatabaseService } from '@/core/database/database.service';
import { DomainError } from '@/shared/types/domain.error';
import { PaymentOrderCreationFailedError } from '../domain/errors/payment.errors';
import { IUser } from '@/shared/types/access-token.payload';

@Injectable()
export class CreatePaymentOrderUseCase {
  private readonly logger = new Logger(CreatePaymentOrderUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async execute(user: IUser, dto: CreateOrderDto) {
    const userId = user.id;
    this.logger.log(
      `Creating order for user ${userId} with data:`,
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
          userId: userId.toString(),
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
        | string
        | undefined;

      await this.db.transaction(async (queryRunner) => {
        const paymentOrder = queryRunner.manager.create(PaymentOrder, {
          client_id: user.profile || null,
          razorpay_order_id: order.providerOrderId,
          amount,
          notes: options.notes,
          status: PaymentStatus.PENDING,
        });
        await queryRunner.manager.save(PaymentOrder, paymentOrder);

        const gatewayTx = queryRunner.manager.create(GatewayTransaction, {
          gateway_name: GatewayName.RAZORPAY,
          client_id: user.profile || null,
          amount,
          currency: 'INR',
          status: GatewayTransactionStatus.PENDING,
          intent,
          gateway_order_id: order.providerOrderId,
          reference_id:
            internalOrderId || (user.profile ? user.profile.toString() : null),
          reference_type: type || 'wallet_recharge',
          metadata: options.notes,
        });
        await queryRunner.manager.save(GatewayTransaction, gatewayTx);

        // If it's a product order, link the Razorpay Order ID to the internal order
        if (type === 'product' && internalOrderId) {
          await this.orderService.setRazorpayOrderId(
            Number(internalOrderId),
            order.providerOrderId,
            queryRunner,
          );
        }
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
