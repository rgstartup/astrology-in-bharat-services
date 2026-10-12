import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { gatewayTransactions, paymentOrders } from '@/core/drizzledb/schema';
import { PaymentStatus } from '@/core/enums';
import {
  GatewayIntent,
  GatewayName,
  GatewayTransactionStatus,
} from '@/internal/finance/payments/enums';
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from '@/external/payment/payment-gateway.interface';
import { DomainError } from '@/shared/types/domain.error';
import { PaymentOrderCreationFailedError } from '@/internal/finance/payments/domain/errors/payment.errors';
import { ClientAccount } from '@/internal/actors/client/account/entities/account.entity';
import { InitiateRechargeDto } from '../dto/initiate-recharge.dto';

@Injectable()
export class InitiateWalletRechargeUseCase {
  private readonly logger = new Logger(InitiateWalletRechargeUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(client: ClientAccount, dto: InitiateRechargeDto) {
    this.logger.log(
      `Initiating wallet recharge order for client ${client.public_id}, amount: ₹${dto.amount}`,
    );

    try {
      const { amount, coupon_code } = dto;

      const options = {
        amount: amount * 100, // in paise
        currency: 'INR',
        receipt: `rcpt_rech_${client.public_id}_${Date.now()}`,
        notes: {
          clientId: client.public_id,
          type: 'wallet_recharge',
          intent: GatewayIntent.WALLET_RECHARGE,
          purpose: 'WALLET_RECHARGE',
          coupon_code: coupon_code || '',
        },
      };

      const order = await this.paymentGateway.createOrder({
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        notes: options.notes,
      });

      await this.db.transaction(async (tx) => {
        await tx.insert(paymentOrders).values({
          client_id: client.id,
          razorpay_order_id: order.providerOrderId,
          amount: String(amount),
          notes: options.notes,
          status: PaymentStatus.PENDING,
        });

        await tx.insert(gatewayTransactions).values({
          gateway_name: GatewayName.RAZORPAY,
          client_id: client.id,
          amount: String(amount),
          currency: order.currency,
          status: GatewayTransactionStatus.PENDING,
          intent: GatewayIntent.WALLET_RECHARGE,
          gateway_order_id: order.providerOrderId,
          reference_id: client.public_id,
          reference_type: 'wallet_recharge',
          metadata: options.notes,
        });
      });

      return {
        id: order.providerOrderId,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      this.logger.error(
        `Error initiating wallet recharge order for client ${client.public_id}`,
        (error as Error).stack,
      );
      if (error instanceof DomainError) {
        throw error;
      }
      throw new PaymentOrderCreationFailedError();
    }
  }
}
