import {
    Controller,
    Post,
    Body,
    Headers,
} from '@nestjs/common';
import { PaymentFacade } from '../../application/payment.facade';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
    path: 'payment/webhook',
    version: '1',
})
export class WebhookController {
    constructor(private readonly paymentFacade: PaymentFacade) { }

    @Public()
    @Post()
    async handleWebhook(
        @Headers('x-razorpay-signature') signature: string,
        @Body() payload: any,
    ) {
        return this.paymentFacade.handleWebhook(signature, payload);
    }
}
