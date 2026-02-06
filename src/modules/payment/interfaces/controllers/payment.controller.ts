import { Controller, Post, Body, UseGuards, Headers, Req } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { Public } from '@/common/interfaces/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CreateOrderDto } from '../../application/dtos/create-order.dto';
import { VerifyPaymentDto } from '../../application/dtos/verify-payment.dto';
import { PaymentService } from '../../application/services/payment.service';

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

