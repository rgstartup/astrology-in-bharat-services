import { Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { VerifyPaymentWebhook } from '@/external/payment/razorpay/decorators/verify-payment-webhook.decorator';

@Controller({
  path: 'payment/webhook',
  version: '1',
})
export class WebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @VerifyPaymentWebhook()
  @Post()
  async handleWebhook(@Req() req: Request) {
    return this.paymentsService.handleWebhook({
      headers: req.headers,
      body: req.body,
    });
  }
}
