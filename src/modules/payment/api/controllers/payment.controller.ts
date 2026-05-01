import {
    Controller,
    Post,
    Body,
    UseGuards,
    NotFoundException,
} from '@nestjs/common';
import { PaymentFacade } from '../../application/payment.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';
import { CreateOrderDto } from '../dto/create-order.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';

@Controller({
    path: 'payment',
    version: '1',
})
export class PaymentController {
    constructor(
        private readonly paymentFacade: PaymentFacade,
        private readonly userRepository: UserRepository,
    ) { }

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @UseGuards(JwtAuthGuard)
    @Post('orders/create')
    async createOrder(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateOrderDto,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.paymentFacade.createOrder(userId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('orders/verify')
    async verifyPayment(@Body() dto: VerifyPaymentDto) {
        return this.paymentFacade.verifyPayment(dto);
    }
}
