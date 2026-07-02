import { PaymentOrder } from '../../infrastructure/entities/payment-order.entity';
import {
  InvalidPaymentSignatureError,
  InvalidWebhookSignatureError,
  PaymentOrderNotFoundError,
} from '../errors/payment.errors';

export class PaymentPolicy {
  static ensurePaymentSignatureValid(isValid: boolean) {
    if (!isValid) {
      throw new InvalidPaymentSignatureError();
    }
  }

  static ensureWebhookSignatureValid(isValid: boolean) {
    if (!isValid) {
      throw new InvalidWebhookSignatureError();
    }
  }

  static ensureOrderExists(
    order: PaymentOrder | null,
  ): asserts order is PaymentOrder {
    if (!order) {
      throw new PaymentOrderNotFoundError();
    }
  }
}
