import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ClientPaymentsService } from '../payments.service';
import { ClientJwtAuthGuard } from '@/internal/domains/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/domains/client/auth/decorators/current-client.decorator';
import { ClientAccount } from '@/internal/domains/client/account/entities/account.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';

@Controller({
  path: 'client/payments',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientPaymentController {
  constructor(private readonly clientPaymentsService: ClientPaymentsService) {}

  @Post('orders/create')
  async createPaymentOrder(
    @CurrentClient() client: ClientAccount,
    @Body() dto: CreateOrderDto,
  ) {
    return this.clientPaymentsService.createPaymentOrder(client, dto);
  }

  @Post('orders/verify')
  async verifyPayment(
    @CurrentClient('id') _clientId: number,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.clientPaymentsService.verifyPayment(dto);
  }
}
