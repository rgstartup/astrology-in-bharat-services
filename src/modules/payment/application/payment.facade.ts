import { Injectable } from '@nestjs/common';
import { CreatePaymentOrderUseCase } from './use-cases/create-payment-order.use-case';
import { VerifyPaymentUseCase } from './use-cases/verify-payment.use-case';
import { HandleWebhookUseCase } from './use-cases/handle-webhook.use-case';
import { CreateOrderDto } from '../api/dto/create-order.dto';
import { VerifyPaymentDto } from '../api/dto/verify-payment.dto';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class PaymentFacade {
  constructor(
    private readonly createPaymentOrderUseCase: CreatePaymentOrderUseCase,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
    private readonly handleWebhookUseCase: HandleWebhookUseCase,
  ) {}

  async createOrder(user: IUser, dto: CreateOrderDto) {
    return this.createPaymentOrderUseCase.execute(user, dto);
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    return this.verifyPaymentUseCase.execute(dto);
  }

  async handleWebhook(signature: string, payload: Record<string, unknown>) {
    return this.handleWebhookUseCase.execute(signature, payload);
  }
}
