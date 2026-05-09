import {
    Controller,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { PaymentFacade } from '../../application/payment.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';

@Controller({
    path: 'payment',
    version: '1',
})
export class PaymentController {
    constructor(private readonly paymentFacade: PaymentFacade) { }

    @UseGuards(JwtAuthGuard)
    @Post('orders/create')
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.paymentFacade.createOrder(user.id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('orders/verify')
    async verifyPayment(@Body() dto: VerifyPaymentDto) {
        return this.paymentFacade.verifyPayment(dto);
    }
}
