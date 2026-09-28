import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';

@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('orders/verify')
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }
}
