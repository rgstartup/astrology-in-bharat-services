import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from './entities/payment-order.entity';
import { GatewayTransaction } from './entities/gateway-transaction.entity';
import { PaymentController } from './controllers/payment.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PaymentsService } from './payments.service';
// import { CreatePaymentOrderUseCase } from './use-cases/create-payment-order.use-case';
import { VerifyPaymentUseCase } from './use-cases/verify-payment.use-case';
import { HandleWebhookUseCase } from './use-cases/handle-webhook.use-case';
import { PaymentIntentDispatcher } from './services/payment-intent-dispatcher.service';
import { PaymentGatewayModule as ExternalPaymentGatewayModule } from '@/external/payment/payment-gateway.module';
import { OrderModule } from '@/internal/commerce/order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, GatewayTransaction]),
    ExternalPaymentGatewayModule,
    forwardRef(() => OrderModule),
  ],
  controllers: [PaymentController, WebhookController],

  providers: [
    PaymentsService,
    // CreatePaymentOrderUseCase,
    VerifyPaymentUseCase,
    HandleWebhookUseCase,
    PaymentIntentDispatcher,
  ],
  exports: [PaymentsService, PaymentIntentDispatcher],
})
export class PaymentsModule {}

export { PaymentsModule as PaymentGatewayModule };
