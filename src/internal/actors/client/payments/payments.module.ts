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
import { VerifyPaymentDrizzleUseCase } from './use-cases/verify-payment-drizzle.use-case';
import { WalletModule as ClientWalletModule } from '@/internal/actors/client/wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, GatewayTransaction]),
    ExternalPaymentGatewayModule,
    FinancePaymentsModule,
    ClientWalletModule,
  ],
  controllers: [ClientPaymentController],
  providers: [
    ClientPaymentsService,
    CreatePaymentOrderUseCase,
    VerifyPaymentUseCase,
    VerifyPaymentDrizzleUseCase,
  ],
  exports: [
    ClientPaymentsService,
    CreatePaymentOrderUseCase,
    VerifyPaymentUseCase,
    VerifyPaymentDrizzleUseCase,
  ],
})
export class ClientPaymentsModule {}

export { ClientPaymentsModule as PaymentsModule };
