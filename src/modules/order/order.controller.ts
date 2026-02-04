import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Standard Controller (Plural 'orders') - Restores /api/v1/orders
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
        return this.orderService.createOrderFromCart(user.id, dto.shippingAddress, dto.couponCode);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser() user: User) {
        return this.orderService.getUserOrders(user.id);
    }

    @Get()
    async getMyOrdersAlias(@CurrentUser() user: User) {
        return this.orderService.getUserOrders(user.id);
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Get('admin/all')
    async getAllOrders() {
        return this.orderService.findAllOrders();
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateOrderStatus(id, dto.status, dto.cancellationReason);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.orderService.getOrderById(id, user.id);
    }
}

// Compatibility Controller (Singular 'order') - For /api/v1/order/my-orders
@Controller({
    path: 'order',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderSingularController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.orderService.createOrderFromCart(user.id, dto.shippingAddress, dto.couponCode);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser() user: User) {
        return this.orderService.getUserOrders(user.id);
    }

    // Admin endpoint also available on singular path for consistency if needed
    @Roles('admin')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateOrderStatus(id, dto.status);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.orderService.getOrderById(id, user.id);
    }
}
