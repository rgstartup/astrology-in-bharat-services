import {
    Controller,
    Post,
    Body,
    UseGuards,
    Headers,
    Req,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
    path: 'payment',
    version: '1',
})
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @UseGuards(JwtAuthGuard)
    @Post('orders/create')
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.paymentService.createOrder(user.id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('orders/verify')
    async verifyPayment(@Body() dto: VerifyPaymentDto) {
        return this.paymentService.verifyPayment(dto);
    }

    @Public()
    @Post('webhook')
    async handleWebhook(
        @Headers('x-razorpay-signature') signature: string,
        @Body() payload: any,
    ) {
        return this.paymentService.handleWebhook(signature, payload);
    }
}
