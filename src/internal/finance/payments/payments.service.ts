import { Injectable } from '@nestjs/common';
import { VerifyPaymentUseCase } from './use-cases/verify-payment.use-case';
import { HandleWebhookUseCase } from './use-cases/handle-webhook.use-case';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { WebhookValidationRequest } from '../../../external/payment/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
  ) {}

  async verifyPayment(dto: VerifyPaymentDto) {
    return this.verifyPaymentUseCase.execute(dto);
  }

  async handleWebhook(request: WebhookValidationRequest) {
    return this.handleWebhookUseCase.execute(request);
  }
}
