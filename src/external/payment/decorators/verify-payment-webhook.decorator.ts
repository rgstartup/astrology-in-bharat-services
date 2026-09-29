import { applyDecorators, UseGuards } from '@nestjs/common';
import { Public } from '../../../shared/decorators/public.decorator';
import { PaymentWebhookGuard } from '../guards/payment-webhook.guard';

export function VerifyPaymentWebhook() {
  return applyDecorators(Public(), UseGuards(PaymentWebhookGuard));
}
