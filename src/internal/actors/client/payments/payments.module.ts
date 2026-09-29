import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from '@/internal/finance/payments/entities/payment-order.entity';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { PaymentGatewayModule as ExternalPaymentGatewayModule } from '@/external/payment/payment-gateway.module';
import { PaymentsModule as FinancePaymentsModule } from '@/internal/finance/payments/payments.module';
import { ClientPaymentController } from './controllers/payment.controller';
import { ClientPaymentsService } from './payments.service';
import { CreatePaymentOrderUseCase } from './use-cases/create-payment-order.use-case';
import { VerifyPaymentUseCase } from './use-cases/verify-payment.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, GatewayTransaction]),
    ExternalPaymentGatewayModule,
    FinancePaymentsModule,
  ],
  controllers: [ClientPaymentController],
  providers: [
    ClientPaymentsService,
    CreatePaymentOrderUseCase,
    VerifyPaymentUseCase,
  ],
  exports: [
    ClientPaymentsService,
    CreatePaymentOrderUseCase,
    VerifyPaymentUseCase,
  ],
})
export class ClientPaymentsModule {}

export { ClientPaymentsModule as PaymentsModule };
