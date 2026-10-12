import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  clientWallets,
  gatewayTransactions,
  paymentOrders,
} from '@/core/drizzledb/schema';
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from '@/external/payment/payment-gateway.interface';
import {
  GatewayIntent,
  GatewayName,
  GatewayTransactionStatus,
} from '@/internal/finance/payments/enums';
import { PaymentStatus } from '@/core/enums';
import { PaymentPolicy } from '@/internal/finance/payments/domain/policies/payment.policy';
import { DomainError } from '@/shared/types/domain.error';
import { PaymentVerificationFailedError } from '@/internal/finance/payments/domain/errors/payment.errors';
import { WalletRechargeFulfillmentService } from '../handlers/wallet-recharge-fulfillment.service';
import { VerifyRechargeDto } from '../dto/verify-recharge.dto';

@Injectable()
export class VerifyWalletRechargeUseCase {
  private readonly logger = new Logger(VerifyWalletRechargeUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(DRIZZLE) private readonly drizzle: DrizzleDb,
    private readonly fulfillment: WalletRechargeFulfillmentService,
  ) {}

  async execute(clientId: number, dto: VerifyRechargeDto) {
    this.logger.log(
      `Verifying wallet recharge for client ${clientId}, order: ${dto.razorpay_order_id}`,
    );

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    // 1. Signature verification (independent of DB)
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
        // 2. Load gateway row + legacy payment order row
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

        // 3. Early exit if already processed (idempotency)
        if (
          (gatewayRow &&
            gatewayRow.status === GatewayTransactionStatus.SUCCESS) ||
          (legacyOrder && legacyOrder.status === PaymentStatus.SUCCESS)
        ) {
          return;
        }

        // 4. Legacy fallback: create the gateway row from the legacy order
        let active = gatewayRow;
        if (!active && legacyOrder) {
          const notes =
            (legacyOrder.notes as Record<string, any> | null) ?? {};
          const intentFromNotes = notes.intent as GatewayIntent | undefined;

          const isProduct =
            intentFromNotes === GatewayIntent.PRODUCT_PURCHASE ||
            notes.type === 'product' ||
            notes.is_order === true ||
            notes.isOrder === true;

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

        // 6. Fulfill — this endpoint serves wallet recharges only, which are
        // fulfilled inline via Drizzle. Other intents have no Drizzle
        // fulfillment path (the intent dispatcher is QueryRunner-bound).
        if (active.intent !== GatewayIntent.WALLET_RECHARGE) {
          this.logger.warn(
            `Verify wallet recharge hit non-wallet intent ${active.intent} for order ${razorpay_order_id}`,
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
    } catch (error) {
      this.logger.error('Error verifying payment', (error as Error).stack);
      if (error instanceof DomainError) {
        throw error;
      }
      throw new PaymentVerificationFailedError();
    }

    const [wallet] = await this.drizzle
      .select({
        id: clientWallets.id,
        balance: clientWallets.balance,
      })
      .from(clientWallets)
      .where(eq(clientWallets.client_id, Number(clientId)))
      .limit(1);

    return {
      success: true,
      message: 'Wallet recharged successfully',
      balance: wallet ? Number(wallet.balance) : 0,
    };
  }
}
