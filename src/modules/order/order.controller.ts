import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller({
    path: 'orders',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.orderService.createOrderFromCart(user.id, dto.shippingAddress);
    }

    @Get()
    async getMyOrders(@CurrentUser() user: User) {
        return this.orderService.getUserOrders(user.id);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.orderService.getOrderById(id, user.id);
    }
}
