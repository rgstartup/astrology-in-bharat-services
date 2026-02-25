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
import { OrderFacade } from '../../application/order.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';

// Standard Controller (Plural 'orders') - Restores /api/v1/orders
@Controller({
    path: 'orders',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderController {
    constructor(private readonly orderFacade: OrderFacade) { }

    @Post()
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.orderFacade.createOrder(user.id, dto);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser() user: User) {
        return this.orderFacade.getUserOrders(user.id);
    }

    @Get()
    async getMyOrdersAlias(@CurrentUser() user: User) {
        return this.orderFacade.getUserOrders(user.id);
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Get('admin/all')
    async getAllOrders() {
        return this.orderFacade.findAllOrders();
    }

    @Roles('admin')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderFacade.updateOrderStatus(id, dto.status, dto.cancellation_reason);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.orderFacade.getOrderById(id, user.id);
    }
}

// Compatibility Controller (Singular 'order') - For /api/v1/order/my-orders
@Controller({
    path: 'order',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class OrderSingularController {
    constructor(private readonly orderFacade: OrderFacade) { }

    @Post()
    async createOrder(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto,
    ) {
        return this.orderFacade.createOrder(user.id, dto);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser() user: User) {
        return this.orderFacade.getUserOrders(user.id);
    }

    // Admin endpoint also available on singular path for consistency if needed
    @Roles('admin')
    @UseGuards(RolesGuard)
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderFacade.updateOrderStatus(id, dto.status, dto.cancellation_reason);
    }

    @Get(':id')
    async getOrder(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.orderFacade.getOrderById(id, user.id);
    }
}
