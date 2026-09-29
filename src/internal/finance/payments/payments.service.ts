import { Injectable } from '@nestjs/common';
import { HandleWebhookUseCase } from '@/internal/finance/payments/use-cases/handle-webhook.use-case';
import { WebhookValidationRequest } from '@/external/payment/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
  ) {}

  async handleWebhook(request: WebhookValidationRequest) {
    return this.handleWebhookUseCase.execute(request);
  }
}
