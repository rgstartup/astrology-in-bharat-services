import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RazorpayProvider } from './razorpay/providers/razorpay.provider';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { PaymentWebhookGuard } from './razorpay/guards/payment-webhook.guard';

@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('PAYMENT_PROVIDER') || 'razorpay';
        switch (provider.toLowerCase()) {
          case 'razorpay':
          default:
            return new RazorpayProvider(config);
        }
      },
      inject: [ConfigService],
    },
    PaymentWebhookGuard,
  ],
  exports: [PAYMENT_GATEWAY, PaymentWebhookGuard],
})
export class PaymentGatewayModule {}
