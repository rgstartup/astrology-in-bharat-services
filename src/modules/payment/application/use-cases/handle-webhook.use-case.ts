import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RazorpayService } from '@/external/razorpay/razorpay.service';
import {
  PaymentOrder,
  PaymentStatus,
} from '../../infrastructure/persistence/entities/payment-order.entity';
import { VerifyPaymentUseCase } from './verify-payment.use-case';
import { PaymentPolicy } from '../../domain/policies/payment.policy';

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
    private readonly razorpayService: RazorpayService,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
  ) {}

  async execute(signature: string, payload: any) {
    // Validate signature
    const isValid = this.razorpayService.validateWebhookSignature(
      payload,
      signature,
    );

    PaymentPolicy.ensureWebhookSignatureValid(isValid);

    const event = payload.event;
    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
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
