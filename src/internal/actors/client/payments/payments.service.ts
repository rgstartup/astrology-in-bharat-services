import { Injectable } from '@nestjs/common';
import { CreatePaymentOrderUseCase } from './use-cases/create-payment-order.use-case';
import { VerifyPaymentUseCase } from './use-cases/verify-payment.use-case';
import { ClientAccount } from '@/internal/actors/client/account/entities/account.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class ClientPaymentsService {
  constructor(
    private readonly createPaymentOrderUseCase: CreatePaymentOrderUseCase,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
  ) {}

  async createPaymentOrder(client: ClientAccount, dto: CreateOrderDto) {
    return this.createPaymentOrderUseCase.execute(client, dto);
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    return this.verifyPaymentUseCase.execute(dto);
  }
}
