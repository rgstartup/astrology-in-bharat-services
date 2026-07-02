import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from '@/external/payment/payment-gateway.interface';
import {
  PaymentOrder,
  PaymentStatus,
} from '../../infrastructure/entities/payment-order.entity';
import { VerifyPaymentUseCase } from './verify-payment.use-case';
import { PaymentPolicy } from '../../domain/policies/payment.policy';

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
  ) {}

  async execute(signature: string, payload: Record<string, unknown>) {
    // Validate signature
    const isValid = this.paymentGateway.validateWebhookSignature(
      payload,
      signature,
    );

    PaymentPolicy.ensureWebhookSignatureValid(isValid);

    const event = payload.event as string;
    if (event === 'payment.captured') {
      const payment = (
        payload.payload as Record<
          string,
          Record<string, Record<string, string>>
        >
      )?.payment?.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Verify if order already processed
      const order = await this.paymentOrderRepo.findOne({
        where: { razorpay_order_id: orderId },
      });

      if (order && order.status !== PaymentStatus.SUCCESS) {
        await this.verifyPaymentUseCase.execute({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: '', // We trust webhook if signature matches
        });
      }
    }

    return { received: true };
  }
}
