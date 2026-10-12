import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
import { PaymentPolicy } from '@/internal/finance/payments/domain/policies/payment.policy';
import { DomainError } from '@/shared/types/domain.error';
import { PaymentVerificationFailedError } from '@/internal/finance/payments/domain/errors/payment.errors';
import { WalletRechargeFulfillmentService } from '@/internal/actors/client/wallet/handlers/wallet-recharge-fulfillment.service';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';

/**
 * Drizzle-native version of `VerifyPaymentUseCase`.
 *
 * Same semantics (signature check → lookup → idempotency → legacy
 * fallback → mark SUCCESS → fulfill), but runs entirely on Drizzle with
 * no TypeORM metadata involved. `WALLET_RECHARGE` intent is fulfilled via
 * `WalletRechargeFulfillmentService`; other intents have no Drizzle
 * fulfillment path yet (the intent dispatcher is QueryRunner-bound), so
 * they fail loudly rather than marking SUCCESS without fulfillment.
 *
 * Not wired to the controller yet — the TypeORM version still serves
 * `POST verify` until the redirect lands.
 */
@Injectable()
export class VerifyPaymentDrizzleUseCase {
  private readonly logger = new Logger(VerifyPaymentDrizzleUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly fulfillment: WalletRechargeFulfillmentService,
    @Inject(DRIZZLE) private readonly drizzle: DrizzleDb,
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
      await this.drizzle.transaction(async (tx) => {
        // 2. Fetch GatewayTransaction + legacy PaymentOrder
        const [gatewayRow] = await tx
          .select()
          .from(gatewayTransactions)
          .where(eq(gatewayTransactions.gateway_order_id, razorpay_order_id))
          .limit(1);

        const [legacyOrder] = await tx
          .select()
          .from(paymentOrders)
          .where(eq(paymentOrders.razorpay_order_id, razorpay_order_id))
          .limit(1);

        if (!gatewayRow && !legacyOrder) {
          PaymentPolicy.ensureOrderExists(null);
        }

        // 3. Early exit if already processed (Idempotency)
        if (
          (gatewayRow &&
            gatewayRow.status === GatewayTransactionStatus.SUCCESS) ||
          (legacyOrder && legacyOrder.status === PaymentStatus.SUCCESS)
        ) {
          return;
        }

        // 4. Legacy fallback: create the gateway row from the payment order
        let active = gatewayRow;
        if (!active && legacyOrder) {
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

          const [created] = await tx
            .insert(gatewayTransactions)
            .values({
              gateway_name: GatewayName.RAZORPAY,
              client_id: legacyOrder.client_id,
              amount: String(legacyOrder.amount),
              currency: 'INR',
              status: GatewayTransactionStatus.PENDING,
              intent,
              gateway_order_id: razorpay_order_id,
              reference_id: legacyOrder.client_id
                ? legacyOrder.client_id.toString()
                : null,
              metadata: legacyOrder.notes,
            })
            .returning();
          active = created;
        }

        if (!active) {
          PaymentPolicy.ensureOrderExists(null);
          throw new PaymentVerificationFailedError();
        }

        // 5. Mark both rows SUCCESS
        await tx
          .update(gatewayTransactions)
          .set({
            status: GatewayTransactionStatus.SUCCESS,
            gateway_payment_id: razorpay_payment_id,
            gateway_signature: razorpay_signature || null,
            updated_at: new Date(),
          })
          .where(eq(gatewayTransactions.id, active.id));

        if (legacyOrder) {
          await tx
            .update(paymentOrders)
            .set({
              status: PaymentStatus.SUCCESS,
              razorpay_payment_id: razorpay_payment_id,
              razorpay_signature: razorpay_signature || '',
              updated_at: new Date(),
            })
            .where(eq(paymentOrders.id, legacyOrder.id));
        }

        // 6. Fulfill — wallet recharges only. Other intents have no Drizzle
        // fulfillment path (the intent dispatcher is QueryRunner-bound).
        if (active.intent !== GatewayIntent.WALLET_RECHARGE) {
          this.logger.warn(
            `Drizzle verify hit non-wallet intent ${active.intent} for order ${razorpay_order_id}`,
          );
          throw new PaymentVerificationFailedError();
        }

        const rechargeClientId = active.client_id;
        if (!rechargeClientId) {
          throw new Error(
            `Cannot top up client wallet: client_id missing on transaction ${active.id}`,
          );
        }

        const amount = Number(active.amount);
        const metadata: Record<string, any> = {
          ...(active.metadata as Record<string, any> | null),
          gateway_name: active.gateway_name,
          gateway_order_id: active.gateway_order_id,
          gateway_payment_id: razorpay_payment_id,
          gateway_signature: razorpay_signature || null,
        };
        const bonusAmount = Number(metadata?.bonus_amount) || 0;
        const totalCredit = amount + bonusAmount;
        const referenceId = `gateway_${razorpay_payment_id || active.id}`;

        await this.fulfillment.fulfillTx(tx, {
          clientId: rechargeClientId,
          amount,
          bonusAmount,
          totalCredit,
          referenceId,
          metadata,
        });
      });

      return {
        success: true,
        message: 'Payment verified and processed successfully',
      };
    } catch (error) {
      this.logger.error('Error verifying payment', (error as Error).stack);
      if (error instanceof DomainError) {
        throw error;
      }
      throw new PaymentVerificationFailedError();
    }
  }
}
