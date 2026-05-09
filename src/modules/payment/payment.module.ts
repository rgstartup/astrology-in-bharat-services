import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from './infrastructure/entities/payment-order.entity';
import { PaymentController } from './api/controllers/payment.controller';
import { WebhookController } from './api/controllers/webhook.controller';
import { PaymentFacade } from './application/payment.facade';
import { CreatePaymentOrderUseCase } from './application/use-cases/create-payment-order.use-case';
import { VerifyPaymentUseCase } from './application/use-cases/verify-payment.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { PaymentGatewayModule } from '@/external/payment/payment-gateway.module';
import { WalletModule } from '@/modules/wallet/wallet.module';
import { OrderModule } from '@/modules/order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder]),
    PaymentGatewayModule,
    WalletModule,
    OrderModule,
  ],
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentFacade,
    CreatePaymentOrderUseCase,
    VerifyPaymentUseCase,
    HandleWebhookUseCase,
  ],
  exports: [PaymentFacade],
})
export class PaymentModule { }
