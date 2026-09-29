import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  type IPaymentGateway,
  PAYMENT_GATEWAY,
} from '../../../../../external/payment/payment-gateway.interface';
import {
  PaymentOrder,
  PaymentStatus,
} from '../../../../finance/payments/entities/payment-order.entity';
import { GatewayTransaction } from '../../../../finance/payments/entities/gateway-transaction.entity';
import {
  GatewayIntent,
  GatewayName,
  GatewayTransactionStatus,
} from '../../../../finance/payments/enums';
import { DatabaseService } from '../../../../../core/database/database.service';
import { DomainError } from '../../../../../shared/types/domain.error';
import { PaymentOrderCreationFailedError } from '../../../../finance/payments/domain/errors/payment.errors';
import { ClientAccount } from '../../account/entities/account.entity';
import { InitiateRechargeDto } from '../dto/initiate-recharge.dto';

@Injectable()
export class InitiateWalletRechargeUseCase {
  private readonly logger = new Logger(InitiateWalletRechargeUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly db: DatabaseService,
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

      await this.db.transaction(async (queryRunner) => {
        const paymentOrder = queryRunner.manager.create(PaymentOrder, {
          client_id: client.id,
          razorpay_order_id: order.providerOrderId,
          amount,
          notes: options.notes,
          status: PaymentStatus.PENDING,
        });
        await queryRunner.manager.save(PaymentOrder, paymentOrder);

        const gatewayTx = queryRunner.manager.create(GatewayTransaction, {
          gateway_name: GatewayName.RAZORPAY,
          client_id: client.id,
          amount,
          currency: order.currency,
          status: GatewayTransactionStatus.PENDING,
          intent: GatewayIntent.WALLET_RECHARGE,
          gateway_order_id: order.providerOrderId,
          reference_id: client.public_id,
          reference_type: 'wallet_recharge',
          metadata: options.notes,
        });
        await queryRunner.manager.save(GatewayTransaction, gatewayTx);
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
