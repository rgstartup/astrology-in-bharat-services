import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from '@/internal/finance/payments/entities/payment-order.entity';
import { GatewayTransaction } from '@/internal/finance/payments/entities/gateway-transaction.entity';
import { WebhookController } from '@/internal/finance/payments/controllers/webhook.controller';
import { PaymentsService } from '@/internal/finance/payments/payments.service';
import { HandleWebhookUseCase } from '@/internal/finance/payments/use-cases/handle-webhook.use-case';
import { PaymentIntentDispatcher } from '@/internal/finance/payments/services/payment-intent-dispatcher.service';
import { PaymentGatewayModule as ExternalPaymentGatewayModule } from '@/external/payment/payment-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, GatewayTransaction]),
    ExternalPaymentGatewayModule,
  ],
  controllers: [WebhookController],
  providers: [PaymentsService, HandleWebhookUseCase, PaymentIntentDispatcher],
  exports: [PaymentsService, PaymentIntentDispatcher, TypeOrmModule],
})
export class PaymentsModule {}

export { PaymentsModule as PaymentGatewayModule };
