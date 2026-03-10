import { Module } from '@nestjs/common';
import { RazorpayProvider } from './razorpay.provider';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';

@Module({
    providers: [
        {
            provide: PAYMENT_GATEWAY,
            useClass: RazorpayProvider,
        },
    ],
    exports: [PAYMENT_GATEWAY],
})
export class PaymentGatewayModule { }
