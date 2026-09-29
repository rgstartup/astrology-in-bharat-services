import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  type IPaymentGateway,
  PAYMENT_GATEWAY,
} from '@/external/payment/payment-gateway.interface';
import { PaymentOrder, PaymentStatus } from '../entities/payment-order.entity';
import { GatewayTransaction } from '../entities/gateway-transaction.entity';
import { GatewayTransactionStatus, GatewayIntent, GatewayName } from '../enums';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';
import { PaymentIntentDispatcher } from '../services/payment-intent-dispatcher.service';
import { PaymentPolicy } from '../domain/policies/payment.policy';
import { DatabaseService } from '@/core/database/database.service';
import { DomainError } from '@/shared/types/domain.error';
import { PaymentVerificationFailedError } from '../domain/errors/payment.errors';

@Injectable()
export class VerifyPaymentUseCase {
  private readonly logger = new Logger(VerifyPaymentUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly paymentIntentDispatcher: PaymentIntentDispatcher,
    private readonly db: DatabaseService,
  ) {}

  async execute(dto: VerifyPaymentDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    // 1. Signature Verification (Independent of DB)
    if (razorpay_signature) {
      const isValid = this.paymentGateway.verifySignature({
        providerOrderId: razorpay_order_id,
        providerPaymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });
      PaymentPolicy.ensurePaymentSignatureValid(isValid);
    }

    try {
      return await this.db.transaction(async (queryRunner) => {
        // 2. Fetch GatewayTransaction with PESSIMISTIC LOCK
        let gatewayTx = await queryRunner.manager.findOne(GatewayTransaction, {
          where: { gateway_order_id: razorpay_order_id },
          lock: { mode: 'pessimistic_write' },
        });

        // Legacy fallback to PaymentOrder if GatewayTransaction doesn't exist yet
        const legacyOrder = await queryRunner.manager.findOne(PaymentOrder, {
          where: { razorpay_order_id: razorpay_order_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!gatewayTx && !legacyOrder) {
          PaymentPolicy.ensureOrderExists(null);
        }

        // 3. Early exit if already processed (Idempotency)
        if (
          (gatewayTx &&
            gatewayTx.status === GatewayTransactionStatus.SUCCESS) ||
          (legacyOrder && legacyOrder.status === PaymentStatus.SUCCESS)
        ) {
          return { success: true, message: 'Payment already verified' };
        }

        // If gatewayTx does not exist, create from legacy order
        if (!gatewayTx && legacyOrder) {
          const intentFromNotes = (legacyOrder.notes?.intent ||
            dto.notes?.intent) as GatewayIntent | undefined;

          const isProduct =
            intentFromNotes === GatewayIntent.PRODUCT_PURCHASE ||
            legacyOrder.notes?.type === 'product' ||
            legacyOrder.notes?.is_order === true ||
            legacyOrder.notes?.isOrder === true;

          const intent =
            intentFromNotes ||
            (isProduct
              ? GatewayIntent.PRODUCT_PURCHASE
              : GatewayIntent.WALLET_RECHARGE);

          gatewayTx = queryRunner.manager.create(GatewayTransaction, {
            gateway_name: GatewayName.RAZORPAY,
            client_id: legacyOrder.client_id,
            amount: legacyOrder.amount,
            currency: 'INR',
            status: GatewayTransactionStatus.PENDING,
            intent,
            gateway_order_id: razorpay_order_id,
            reference_id: legacyOrder.client_id
              ? legacyOrder.client_id.toString()
              : null,
            metadata: legacyOrder.notes,
          });
        }

        // 4. Mark as SUCCESS
        if (gatewayTx) {
          gatewayTx.status = GatewayTransactionStatus.SUCCESS;
          gatewayTx.gateway_payment_id = razorpay_payment_id;
          gatewayTx.gateway_signature = razorpay_signature || null;
          await queryRunner.manager.save(GatewayTransaction, gatewayTx);
        }

        if (legacyOrder) {
          legacyOrder.status = PaymentStatus.SUCCESS;
          legacyOrder.razorpay_payment_id = razorpay_payment_id;
          legacyOrder.razorpay_signature = razorpay_signature || '';
          await queryRunner.manager.save(PaymentOrder, legacyOrder);
        }

        // 5. Delegate domain fulfillment via Intent Dispatcher
        if (gatewayTx) {
          await this.paymentIntentDispatcher.dispatchSuccess(
            gatewayTx,
            queryRunner,
          );
        }

        return {
          success: true,
          message: 'Payment verified and processed successfully',
        };
      });
    } catch (error) {
      this.logger.error('Error verifying payment', (error as Error).stack);
      if (error instanceof DomainError) {
        throw error;
      }
      throw new PaymentVerificationFailedError();
    }
  }
}
