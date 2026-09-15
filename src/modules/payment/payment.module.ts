import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from './entities/payment-order.entity';
import { PaymentController } from './controllers/payment.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PaymentFacade } from './payment.facade';
import { CreatePaymentOrderUseCase } from './use-cases/create-payment-order.use-case';
import { VerifyPaymentUseCase } from './use-cases/verify-payment.use-case';
import { HandleWebhookUseCase } from './use-cases/handle-webhook.use-case';
import { PaymentGatewayModule } from '@/external/payment/payment-gateway.module';
import { WalletModule } from '@/modules/finance/wallet/wallet.module';
import { OrderModule } from '@/modules/commerce/order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder]),
    PaymentGatewayModule,
    WalletModule,
    forwardRef(() => OrderModule),
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
export class PaymentModule {}
